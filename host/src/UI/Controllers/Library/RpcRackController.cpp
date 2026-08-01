#include "RpcRackController.h"
#include "AceCatalog.h"
#include "EngineConfigManager.h"
#include "PatchIdentifiers.h"
#include <juce_core/juce_core.h>
#include <algorithm>

namespace Omega {
namespace UI {

    void RpcRackController::registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad) {
        dispatcher.registerHandler("addModule",          [this, onLoad](const juce::var& rid, const juce::var& p) { return handleAddModule(rid, p, onLoad); });
        dispatcher.registerHandler("removeModule",       [this, onLoad](const juce::var& rid, const juce::var& p) { return handleRemoveModule(rid, p, onLoad); });
        dispatcher.registerHandler("moveModule",         [this, onLoad](const juce::var& rid, const juce::var& p) { return handleMoveModule(rid, p, onLoad); });
        dispatcher.registerHandler("clearRack",          [this, onLoad](const juce::var& rid, const juce::var& p) { return handleClearRack(rid, p, onLoad); });
    }

    juce::var RpcRackController::handleAddModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        mHistory.pushUndoSnapshot();
        auto componentId = payload["componentId"].toString();
        auto typeId = Core::Model::mapIdToType(componentId.toStdString());
        
        if (typeId == Core::Model::ModuleTypeId::None) {
            return createError("ADD_MODULE_ACK", requestId, "Component not Era 7 compatible: " + componentId);
        }

        auto doc = mHistory.engineConfig().getPatchDocument();
        
        Core::Model::ModuleInstance ni;
        ni.typeId = typeId;
        
        uint32_t maxId = 0;
        for (const auto& m : doc.modules) if (m.instanceId > maxId) maxId = m.instanceId;
        ni.instanceId = maxId + 1;
        
        auto info = mCatalog.getComponent(componentId.toStdString());
        ni.position.rack = (info && info->rack == "upper") ? 1 : 0;
        ni.position.slot = (int16_t)doc.modules.size();
        
        doc.modules.push_back(ni);
        mHistory.applyAndNotify(doc, onLoad);
        
        return createResponse("ADD_MODULE_ACK", requestId, juce::var(), true);
    }

    juce::var RpcRackController::handleRemoveModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        mHistory.pushUndoSnapshot();
        juce::String idStr = payload["instanceId"].toString();
        uint32_t instanceId = 0;
        
        if (idStr.startsWith("v7_")) {
            instanceId = (uint32_t)idStr.substring(3).getLargeIntValue();
        } else {
            instanceId = (uint32_t)payload["instanceId"].operator int();
        }
        
        auto doc = mHistory.engineConfig().getPatchDocument();
        auto it = std::find_if(doc.modules.begin(), doc.modules.end(), 
                               [instanceId](const Core::Model::ModuleInstance& m) { return m.instanceId == instanceId; });
        
        if (it != doc.modules.end()) {
            doc.modules.erase(it);
            mHistory.applyAndNotify(doc, onLoad);
            return createResponse("REMOVE_MODULE_ACK", requestId, juce::var(), true);
        }
        
        return createError("REMOVE_MODULE_ACK", requestId, "Module not found (Era 7)");
    }

    juce::var RpcRackController::handleMoveModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        mHistory.pushUndoSnapshot();
        juce::String idStr = payload["instanceId"].toString();
        int direction = (int)payload["direction"];
        uint32_t instanceId = 0;
        
        if (idStr.startsWith("v7_")) {
            instanceId = (uint32_t)idStr.substring(3).getLargeIntValue();
            
            auto doc = mHistory.engineConfig().getPatchDocument();
            auto it = std::find_if(doc.modules.begin(), doc.modules.end(), 
                                   [instanceId](const Core::Model::ModuleInstance& m) { return m.instanceId == instanceId; });
            
            if (it != doc.modules.end()) {
                int oldIdx = (int)std::distance(doc.modules.begin(), it);
                int newIdx = oldIdx + direction;
                
                if (newIdx >= 0 && newIdx < (int)doc.modules.size()) {
                    auto mod = *it;
                    doc.modules.erase(it);
                    doc.modules.insert(doc.modules.begin() + newIdx, mod);
                    
                    for (int i = 0; i < (int)doc.modules.size(); ++i) {
                        doc.modules[i].position.slot = (int16_t)i;
                    }
                    
                    mHistory.applyAndNotify(doc, onLoad);
                    return createResponse("MOVE_MODULE_ACK", requestId, juce::var(), true);
                }
            }
        }
        return createError("MOVE_MODULE_ACK", requestId, "Move invalid in Era 7 Mode");
    }

    juce::var RpcRackController::handleClearRack(const juce::var& requestId, const juce::var&, std::function<void()> onLoad) {
        mHistory.pushUndoSnapshot();
        auto doc = mHistory.engineConfig().getPatchDocument();
        doc.modules.clear();
        doc.connections.clear();
        doc.patchbayMatrix.clear();
        mHistory.applyAndNotify(doc, onLoad);
        return createResponse("CLEAR_RACK_ACK", requestId, {}, true);
    }

} // namespace UI
} // namespace Omega
