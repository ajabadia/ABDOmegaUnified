#include "RpcMetadataController.h"
#include "OmegaAudioProcessor.h"
#include "PerformanceMonitor.h"
#include "OmegaIdentifiers.h"
#include "ParameterMetadataRegistry.h"
#include "SemanticBrokerService.h"
#include "ModulationRegistry.h"
#include <juce_core/juce_core.h>

/** [BUILD_FORCE_72] OMEGA Aseptic Metadata Controller (Era 7.2.3). **/
namespace Omega::UI {

    RpcMetadataController::RpcMetadataController(Plugin::OmegaAudioProcessor* processor)
        : mProcessor(processor) {}

    void RpcMetadataController::registerCommands(RpcCommandDispatcher& dispatcher) {
        dispatcher.registerHandler("getMetadata", [this](const juce::var& rid, const juce::var& p) { return handleGetMetadata(rid, p); });
        dispatcher.registerHandler("getSampleRate", [this](const juce::var& rid, const juce::var& p) { return handleGetSampleRate(rid, p); });
        dispatcher.registerHandler("getTempo", [this](const juce::var& rid, const juce::var& p) { return handleGetTempo(rid, p); });
        dispatcher.registerHandler("getInventory", [this](const juce::var& rid, const juce::var& p) { return handleGetInventory(rid, p); });
        dispatcher.registerHandler("getUiSchemas", [this](const juce::var& rid, const juce::var& p) { return handleGetUiSchemas(rid, p); });
    }

    juce::var RpcMetadataController::handleGetMetadata(const juce::var& requestId, const juce::var&) {
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        root->setProperty("engine", "OMEGA Aseptic Orchestrator");
        root->setProperty("era", "7.2.3");

        juce::Array<juce::var> parameters;
        for (auto const& [id, desc] : registry.getAllParameters()) {
            parameters.add(descriptorToVar(desc));
        }
        root->setProperty("parameters", parameters);

        return createResponse("METADATA", requestId, juce::var(), root.get());
    }

    juce::var RpcMetadataController::handleGetSampleRate(const juce::var& requestId, const juce::var&) {
        // [Aseptic] Query dynamic host sample rate
        double sr = mProcessor ? mProcessor->getSampleRate() : 44100.0;
        return createResponse("SAMPLE_RATE", requestId, juce::var(), sr);
    }

    juce::var RpcMetadataController::handleGetTempo(const juce::var& requestId, const juce::var&) {
        // [Aseptic] Query dynamic host tempo (BPM) with Preference Fallback
        double bpm = 0.0;
        
        if (mProcessor) {
            if (auto* ph = mProcessor->getPlayHead()) {
                if (auto pos = ph->getPosition()) {
                    if (auto optBpm = pos->getBpm()) bpm = *optBpm;
                }
            }
            
            // If host tempo is unavailable (Standalone), use system settings
            if (bpm <= 0.0) {
                bpm = (double)mProcessor->getSystemSettings().getSettingValue("default_tempo");
            }
        }
        
        if (bpm <= 0.0) bpm = 120.0; // Hard fail-safe
        
        return createResponse("TEMPO", requestId, juce::var(), bpm);
    }

    juce::var RpcMetadataController::handleGetInventory(const juce::var& requestId, const juce::var&) {
        if (!mProcessor) return createError("GET_INVENTORY", requestId, "Missing Processor");
        
        auto& catalog = mProcessor->getCatalog();
        juce::Array<juce::var> components;

        for (auto const* info : catalog.getComponents()) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(info->id));
            obj->setProperty("name", juce::String(info->name));
            obj->setProperty("family", juce::String(info->family));
            obj->setProperty("engine", "WASM");
            obj->setProperty("version", info->version);
            obj->setProperty("hp", info->hp);
            
            // ERA 7 Dynamic UI Export
            auto contract = catalog.exportComponentContract(info->id);
            if (contract.getDynamicObject()) {
                obj->setProperty("ui", contract["ui"]);
                obj->setProperty("registry", contract["registry"]);
            }

            components.add(juce::var(obj.get()));
        }
        
        juce::DynamicObject::Ptr payload = new juce::DynamicObject();
        payload->setProperty("schemaVersion", "1.1");
        payload->setProperty("components", components);
        
        return createResponse("INVENTORY", requestId, juce::var(), payload.get());
    }

    juce::var RpcMetadataController::handleGetUiSchemas(const juce::var& requestId, const juce::var&) {
        juce::DynamicObject::Ptr payload = new juce::DynamicObject();
        juce::Array<juce::var> schemas;
        
        if (mProcessor) {
            auto& catalog = mProcessor->getCatalog();
            for (auto const* info : catalog.getComponents()) {
                schemas.add(catalog.exportComponentContract(info->id));
            }
        }

        payload->setProperty("schemas", schemas);
        return createResponse("UISCHEMAS", requestId, juce::var(), payload.get());
    }

    juce::var RpcMetadataController::descriptorToVar(const Core::ParameterDescriptor& d) {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("id", juce::String(d.id));
        obj->setProperty("name", juce::String(d.name));
        obj->setProperty("min", d.minValue);
        obj->setProperty("max", d.maxValue);
        obj->setProperty("default", d.defaultValue);
        obj->setProperty("unit", juce::String(d.unit));
        return juce::var(obj.get());
    }

} // namespace Omega::UI
