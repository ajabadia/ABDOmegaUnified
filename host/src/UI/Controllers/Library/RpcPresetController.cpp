#include "RpcPresetController.h"
#include "VarSerialization.h"
#include "AceCatalog.h"
#include "EngineConfigManager.h"
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_core/juce_core.h>

namespace Omega {
namespace UI {

    // -------------------------------------------------------------------------
    // Command registration (preset CRUD only)
    // -------------------------------------------------------------------------

    void RpcPresetController::registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad) {
        dispatcher.registerHandler("listAce",            [this](const juce::var& rid, const juce::var& p) { return handleListAceComponents(rid, p); });
        dispatcher.registerHandler("loadPreset",         [this, onLoad](const juce::var& rid, const juce::var& p) { return handleLoadPreset(rid, p, onLoad); });
        dispatcher.registerHandler("newPreset",          [this, onLoad](const juce::var& rid, const juce::var& p) { return handleNewPreset(rid, p, onLoad); });
        dispatcher.registerHandler("savePreset",         [this](const juce::var& rid, const juce::var& p) { return handleSavePreset(rid, p); });
        dispatcher.registerHandler("listPresets",        [this](const juce::var& rid, const juce::var& p) { return handleListPresets(rid, p); });
        dispatcher.registerHandler("getBrowserData",     [this](const juce::var& rid, const juce::var& p) { return handleGetBrowserData(rid, p); });
    }

    juce::var RpcPresetController::handleListAceComponents(const juce::var& requestId, const juce::var&) {
        juce::Array<juce::var> components;
        for (const auto& comp : mCatalog.getComponents()) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(comp->id));
            obj->setProperty("name", juce::String(comp->name));
            obj->setProperty("family", juce::String(comp->family));
            components.add(juce::var(obj.get()));
        }
        return createResponse("ACE_LIST", requestId, juce::var(), components);
    }

    juce::var RpcPresetController::handleLoadPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        auto data = payload["data"];
        if (data.isVoid()) {
            auto doc = mHistory.engineConfig().getPatchDocument();
            return createResponse("LOAD_ACK", requestId, juce::var(), VarSerialization::patchDocumentToVar(doc));
        }
        mHistory.pushUndoSnapshot();
        auto doc = VarSerialization::varToPatchDocument(data);
        mHistory.applyAndNotify(doc, onLoad);
        return createResponse("LOAD_ACK", requestId, {}, true);
    }

    juce::var RpcPresetController::handleNewPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        mHistory.pushUndoSnapshot();
        Core::Model::PatchDocument doc;
        doc.metadata.name = "Aseptic Initial Patch";
        doc.masterGainDb = 0.0f;
        
        mHistory.applyAndNotify(doc, onLoad);
        
        return createResponse("NEW_ACK", requestId, {}, true);
    }

    juce::var RpcPresetController::handleSavePreset(const juce::var& requestId, const juce::var&) {
        auto doc = mHistory.engineConfig().getPatchDocument();
        auto serialized = VarSerialization::patchDocumentToVar(doc);
        return createResponse("SAVE_ACK", requestId, juce::var(), serialized);
    }

    juce::var RpcPresetController::handleListPresets(const juce::var& requestId, const juce::var&) {
        juce::Array<juce::var> list;
        list.add("Default Era 7 Patch");
        return createResponse("PRESET_LIST", requestId, juce::var(), list);
    }

    juce::var RpcPresetController::handleGetBrowserData(const juce::var& requestId, const juce::var&) {
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        juce::Array<juce::var> libraries;

        juce::DynamicObject::Ptr factLib = new juce::DynamicObject();
        factLib->setProperty("name", "Factory Era 7");
        factLib->setProperty("category", "Factory");
        
        juce::Array<juce::var> patches;
        factLib->setProperty("patches", patches);
        libraries.add(juce::var(factLib.get()));

        root->setProperty("libraries", libraries);
        
        juce::Array<juce::var> categories;
        categories.add("Factory");
        root->setProperty("categories", categories);

        return createResponse("BROWSER_DATA", requestId, juce::var(), juce::var(root.get()));
    }

} // namespace UI
} // namespace Omega
