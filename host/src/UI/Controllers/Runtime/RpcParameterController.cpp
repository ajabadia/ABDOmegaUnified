#include "RpcParameterController.h"
#include "OmegaAudioProcessor.h"
#include "EngineConfigManager.h"
#include "VarSerialization.h"

namespace Omega {
namespace UI {

    RpcParameterController::RpcParameterController(Plugin::OmegaAudioProcessor* processor, juce::AudioProcessorValueTreeState& apvts)
        : mProcessor(processor), mApvts(apvts)
    {
    }

    void RpcParameterController::setupParameterCommands(RpcCommandDispatcher& dispatcher) {
        dispatcher.registerHandler("setParameter", [this](const juce::var& r, const juce::var& p) { 
            return this->handleSetParameter(r, p); 
        });
        
        dispatcher.registerHandler("getState", [this](const juce::var& r, const juce::var& p) { 
            return this->handleGetState(r, p); 
        });
    }

    juce::var RpcParameterController::handleSetParameter(const juce::var& requestId, const juce::var& payload)
    {
        float value = (float)payload["value"];

        if (mProcessor) {
            auto& configStore = mProcessor->getEngineConfigManager();

            if (payload.hasProperty("instanceId") && payload.hasProperty("paramId")) {
                uint32_t instanceId = static_cast<uint32_t>((int)payload["instanceId"]);
                uint16_t paramId = static_cast<uint16_t>((int)payload["paramId"]);
                configStore.updateParameter(instanceId, static_cast<Core::Model::ParamId>(paramId), value);
            }
            else {
                juce::String target = payload["target"].toString();
                if (auto* param = mApvts.getParameter(target)) {
                    param->beginChangeGesture();
                    param->setValueNotifyingHost(value);
                    param->endChangeGesture();
                }
            }
        }

        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        resp->setProperty("type", "PARAM_ACK");
        resp->setProperty("requestId", requestId);
        resp->setProperty("payload", payload);
        return juce::var(resp.get());
    }

    juce::var RpcParameterController::handleGetState(const juce::var& requestId, const juce::var& payload)
    {
        juce::DynamicObject::Ptr stateObj = new juce::DynamicObject();
        stateObj->setProperty("schemaVersion", "7.0"); // Era 7 Aseptic SOT
        
        if (mProcessor) {
            // Mismo patch shape que onStateUpdate (forceRepaint):
            // name/author/masterGainDb + modules + globalFxParams + patchbayMatrix.
            const auto& doc = mProcessor->getEngineConfigManager().getPatchDocument();
            stateObj->setProperty("patch", VarSerialization::buildPatchWireVar(doc));
        }

        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        resp->setProperty("type", "state");
        resp->setProperty("requestId", requestId);
        resp->setProperty("payload", juce::var(stateObj.get()));
        return juce::var(resp.get());
    }

} // namespace UI
} // namespace Omega
