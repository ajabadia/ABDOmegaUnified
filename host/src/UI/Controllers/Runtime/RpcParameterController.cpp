#include "RpcParameterController.h"
#include "OmegaAudioProcessor.h"
#include "EngineConfigManager.h"

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
            const auto& doc = mProcessor->getEngineConfigManager().getPatchDocument();
            
            juce::DynamicObject::Ptr docObj = new juce::DynamicObject();
            docObj->setProperty("name", juce::String(doc.metadata.name));
            docObj->setProperty("author", juce::String(doc.metadata.author));
            docObj->setProperty("masterGainDb", doc.masterGainDb);
            
            juce::Array<juce::var> modules;
            for (const auto& m : doc.modules) {
                juce::DynamicObject::Ptr mObj = new juce::DynamicObject();
                mObj->setProperty("instanceId", (int)m.instanceId);
                mObj->setProperty("typeId", (int)m.typeId);
                mObj->setProperty("componentId", juce::String(Core::Model::mapTypeToId(m.typeId)));
                mObj->setProperty("rack", m.position.rack == 1 ? "upper" : "lower");
                
                juce::DynamicObject::Ptr params = new juce::DynamicObject();
                for (const auto& p : m.parameters) {
                    params->setProperty(juce::String((int)p.id), p.value);
                }
                mObj->setProperty("params", juce::var(params.get()));
                modules.add(juce::var(mObj.get()));
            }
            docObj->setProperty("modules", modules);
            stateObj->setProperty("patch", juce::var(docObj.get()));
        }

        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        resp->setProperty("type", "state");
        resp->setProperty("requestId", requestId);
        resp->setProperty("payload", juce::var(stateObj.get()));
        return juce::var(resp.get());
    }

} // namespace UI
} // namespace Omega
