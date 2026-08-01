#include "RpcTelemetryController.h"
#include "RpcPresetController.h"
#include "../../../Plugin/OmegaAudioProcessor.h"
#include "../../../Core/Model/Patch/PatchDocument.h"
#include "EngineConfigManager.h"
#include "../../../Core/Providers/Telemetry/ModulationTelemetryRegistry.h"

namespace Omega {
namespace UI {

    void RpcTelemetryController::registerCommands(RpcCommandDispatcher& dispatcher, juce::var& scopeState) {
        dispatcher.registerHandler("getTelemetry",        [this](const juce::var& rid, const juce::var& p) { return handleGetTelemetry(rid, p); });
        dispatcher.registerHandler("subscribeTelemetry", [this](const juce::var& rid, const juce::var& p) { return handleSubscribeTelemetry(rid, p); });
        dispatcher.registerHandler("getTelemetrySources", [this](const juce::var& rid, const juce::var& p) { return handleGetTelemetrySources(rid, p); });
        dispatcher.registerHandler("getModConnections",   [this](const juce::var& rid, const juce::var& p) { return handleGetModConnections(rid, p); });
        dispatcher.registerHandler("getScopeState",       [this, &scopeState](const juce::var& rid, const juce::var& p) { return handleGetScopeState(rid, p, scopeState); });
        dispatcher.registerHandler("setScopeState",       [this, &scopeState](const juce::var& rid, const juce::var& p) { return handleSetScopeState(rid, p, scopeState); });
    }

    juce::var RpcTelemetryController::handleSubscribeTelemetry(const juce::var& requestId, const juce::var& payload) {
        std::lock_guard<std::mutex> lock(mSubscriptionMutex);
        
        mDiscretePins.clear();
        mStreamingPins.clear();

        if (payload.hasProperty("pins") && payload["pins"].isArray()) {
            auto* arr = payload["pins"].getArray();
            auto& registry = Core::Providers::ModulationTelemetryRegistry::getInstance();

            for (int i = 0; i < arr->size(); ++i) {
                juce::var entry = arr->getReference(i);
                std::string pinId;
                bool forceStreaming = false;

                if (entry.isObject()) {
                    pinId = entry["id"].toString().toStdString();
                    forceStreaming = (bool)entry["stream"];
                } else {
                    pinId = entry.toString().toStdString();
                }

                // If it's a known audio/mod pin, or explicitly requested, put in streaming tier
                int idx = registry.getPinIndex(pinId);
                mDiscretePins.insert(pinId); // Everything is available as discrete

                if (forceStreaming || pinId == "system:midi_monitor") {
                    mStreamingPins.insert(pinId);
                }
            }
        }
        return createResponse("SUBSCRIBE_ACK", requestId, juce::var(), true);
    }

    juce::var RpcTelemetryController::collectTelemetry(bool includeStreaming) {
        std::lock_guard<std::mutex> lock(mSubscriptionMutex);
        
        if (mDiscretePins.empty() && mStreamingPins.empty()) return juce::var();

        using namespace Core::Providers;
        auto& hub = ModulationTelemetryHub::getInstance();
        auto& registry = ModulationTelemetryRegistry::getInstance();
        juce::DynamicObject::Ptr results = new juce::DynamicObject();

        // 1. DISCRETE TIER (Always collected - Very cheap)
        for (const auto& pinId : mDiscretePins) {
            int idx = registry.getPinIndex(pinId);
            juce::DynamicObject::Ptr pinData = new juce::DynamicObject();
            pinData->setProperty("pk", (double)hub.getPeakAndReset(idx));
            pinData->setProperty("v",  (double)hub.getLatest(idx));
            results->setProperty(juce::String(pinId), juce::var(pinData.get()));
        }

        // 2. STREAMING TIER (Only collected if includeStreaming is true - Expensive)
        if (includeStreaming) {
            for (const auto& pinId : mStreamingPins) {
                int idx = registry.getPinIndex(pinId);
                if (idx == -1) continue;

                juce::var pinDataVar = results->getProperty(juce::String(pinId));
                juce::DynamicObject* pinData = nullptr;
                
                if (pinDataVar.isObject()) {
                    pinData = pinDataVar.getDynamicObject();
                } else {
                    pinData = new juce::DynamicObject();
                    results->setProperty(juce::String(pinId), juce::var(pinData));
                }

                int resolution = (int)mSettings.getSettingValue("scopeResolution");
                if (resolution <= 0) resolution = 1024;
                
                std::vector<float> history(resolution);
                hub.getHistory(idx, history.data(), resolution);
                
                juce::Array<juce::var> trace;
                for (float v : history) trace.add(v);
                pinData->setProperty("h", trace); // Short name 'h' for history
            }
        }

        return results->getProperties().size() > 0 ? juce::var(results.get()) : juce::var();
    }

    juce::var RpcTelemetryController::handleGetTelemetry(const juce::var& requestId, const juce::var& payload) {
        using namespace Core::Providers;
        auto pinsToRequest = payload["pins"];
        auto& hub = ModulationTelemetryHub::getInstance();
        auto& registry = ModulationTelemetryRegistry::getInstance();
        juce::DynamicObject::Ptr results = new juce::DynamicObject();

        if (pinsToRequest.isArray()) {
            auto* arr = pinsToRequest.getArray();
            for (int i = 0; i < arr->size(); ++i) {
                std::string pinId = arr->getReference(i).toString().toStdString();
                int idx = registry.getPinIndex(pinId);
                if (idx == -1) continue;

                juce::DynamicObject::Ptr pinData = new juce::DynamicObject();
                pinData->setProperty("pk", (double)hub.getPeakAndReset(idx));
                pinData->setProperty("v", (double)hub.getLatest(idx));

                if ((bool)payload["streaming"]) {
                    int resolution = (int)mSettings.getSettingValue("scopeResolution");
                    if (resolution <= 0) resolution = 1024;
                    std::vector<float> history(resolution);
                    hub.getHistory(idx, history.data(), resolution);
                    juce::Array<juce::var> trace;
                    for (float v : history) trace.add(v);
                    pinData->setProperty("h", trace);
                }
                results->setProperty(juce::String(pinId), juce::var(pinData.get()));
            }
        }
        return createResponse("TELEMETRY_DATA", requestId, juce::var(), results.get());
    }

    juce::var RpcTelemetryController::handleGetTelemetrySources(const juce::var& requestId, const juce::var&) {
        using namespace Core::Providers;
        auto activePins = ModulationTelemetryRegistry::getInstance().getActivePins();
        
        juce::Array<juce::var> sources;
        for (const auto& pin : activePins) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(pin.id));
            obj->setProperty("label", juce::String(pin.label));
            obj->setProperty("type", (int)pin.type);
            sources.add(juce::var(obj.get()));
        }

        juce::DynamicObject::Ptr results = new juce::DynamicObject();
        results->setProperty("sources", sources);
        return createResponse("TELEMETRY_SOURCES", requestId, juce::var(), results.get());
    }

    juce::var RpcTelemetryController::handleGetScopeState(const juce::var& requestId, const juce::var&, const juce::var& currentScopeState) {
        return createResponse("SCOPE_STATE", requestId, juce::var(), currentScopeState);
    }

    juce::var RpcTelemetryController::handleSetScopeState(const juce::var& requestId, const juce::var& payload, juce::var& targetScopeState) {
        targetScopeState = payload;
        return createResponse("SCOPE_ACK", requestId, juce::var(), true);
    }

    juce::var RpcTelemetryController::handleGetModConnections(const juce::var& requestId, const juce::var&) {
        return createResponse("MOD_CONNECTIONS", requestId, juce::var(), juce::Array<juce::var>());
    }

} // namespace UI
} // namespace Omega
