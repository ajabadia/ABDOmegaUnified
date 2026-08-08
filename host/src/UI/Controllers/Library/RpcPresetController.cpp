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
        dispatcher.registerHandler("saveCurrentPatch",   [this](const juce::var& rid, const juce::var& p) { return handleSaveCurrentPatch(rid, p); });
        dispatcher.registerHandler("listPresets",        [this](const juce::var& rid, const juce::var& p) { return handleListPresets(rid, p); });
        dispatcher.registerHandler("getBrowserData",     [this](const juce::var& rid, const juce::var& p) { return handleGetBrowserData(rid, p); });
        dispatcher.registerHandler("deletePreset",       [this](const juce::var& rid, const juce::var& p) { return handleDeletePreset(rid, p); });
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
        if (!data.isVoid()) {
            // Legacy: la UI antigua enviaba el documento completo serializado.
            mHistory.pushUndoSnapshot();
            auto doc = VarSerialization::varToPatchDocument(data);
            mHistory.applyAndNotify(doc, onLoad);
            return createResponse("LOAD_ACK", requestId, {}, true);
        }

        // [P0-3] Carga por nombre desde el repositorio a disco (payload.target).
        juce::String target = payload["target"].toString().trim();
        if (target.isNotEmpty()) {
            // 1) Preset de usuario (disco) — si el usuario guardó un patch con el
            // mismo nombre que uno de fábrica, su copia manda.
            Core::Model::PatchDocument loaded;
            if (mRepository.load(target, loaded)) {
                mHistory.pushUndoSnapshot();
                mHistory.applyAndNotify(loaded, onLoad);
                return createResponse("LOAD_ACK", requestId, {}, true);
            }

            // 2) [P2-4] Patch de fábrica programático (librería real, no el INIT
            // silencioso de antes): el nombre coincide con un preset de fábrica →
            // se aplica su documento. Mismo flujo que uno de usuario.
            for (const auto& factory : Core::Model::createFactoryPresets()) {
                if (factory.name == target.toStdString()) {
                    mHistory.pushUndoSnapshot();
                    mHistory.applyAndNotify(factory.doc, onLoad);
                    return createResponse("LOAD_ACK", requestId, {}, true);
                }
            }

            // 3) Nombre desconocido: el browser carga el patch inicial (midi_in
            // incluido) — comportamiento de seguridad, no debería ocurrir con la
            // librería sincronizada.
            mHistory.pushUndoSnapshot();
            mHistory.applyAndNotify(Core::Model::createDefaultPatch(), onLoad);
            return createResponse("LOAD_ACK", requestId, {}, true);
        }

        auto doc = mHistory.engineConfig().getPatchDocument();
        return createResponse("LOAD_ACK", requestId, juce::var(), VarSerialization::patchDocumentToVar(doc));
    }

    juce::var RpcPresetController::handleNewPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        mHistory.pushUndoSnapshot();
        // [P0-2] Modular puro: el patch inicial incluye midi_in (fuente única en
        // Core::Model::createDefaultPatch — misma función que usa el arranque del
        // plugin, sin duplicación).
        mHistory.applyAndNotify(Core::Model::createDefaultPatch(), onLoad);
        return createResponse("NEW_ACK", requestId, {}, true);
    }

    juce::var RpcPresetController::handleSavePreset(const juce::var& requestId, const juce::var& payload) {
        // [P0-3] Persistencia a disco: el frontend envía { name } y el host
        // escribe <Nombre>.patch.json en %AppData%/ABDOmega/patches.
        juce::String name = payload["name"].toString().trim();
        if (name.isNotEmpty()) {
            auto doc = mHistory.engineConfig().getPatchDocument();
            if (mRepository.save(doc, name)) {
                return createResponse("SAVE_ACK", requestId, {}, true);
            }
            return createError("SAVE_FAILED", requestId, "Could not write patch to disk");
        }

        // Legacy (sin nombre): devolver el documento serializado para que la UI
        // antigua lo conserve (compatibilidad con el flujo localStorage).
        auto doc = mHistory.engineConfig().getPatchDocument();
        auto serialized = VarSerialization::patchDocumentToVar(doc);
        return createResponse("SAVE_ACK", requestId, juce::var(), serialized);
    }

    juce::var RpcPresetController::handleSaveCurrentPatch(const juce::var& requestId, const juce::var&) {
        // [P0-3] Autosave de sesión: current.patch.json. También lo invoca
        // OmegaAudioProcessor::saveCurrentPatch() al apagar.
        auto doc = mHistory.engineConfig().getPatchDocument();
        if (mRepository.saveCurrent(doc)) {
            return createResponse("SAVE_ACK", requestId, {}, true);
        }
        return createError("SAVE_FAILED", requestId, "Could not write current patch to disk");
    }

    juce::var RpcPresetController::handleListPresets(const juce::var& requestId, const juce::var&) {
        // [P0-3] Lista real desde disco (antes: literal hardcodeado).
        juce::Array<juce::var> list;
        for (const auto& info : mRepository.list())
            list.add(info.name);
        return createResponse("PRESET_LIST", requestId, juce::var(), list);
    }

    juce::var RpcPresetController::handleGetBrowserData(const juce::var& requestId, const juce::var&) {
        // [P0-3] Librerías reales: Factory (patch inicial) + User (disco).
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        juce::Array<juce::var> libraries;

        // --- Factory (P2-4: librería real programática, no hardcoded) ---
        juce::DynamicObject::Ptr factLib = new juce::DynamicObject();
        factLib->setProperty("name", "FACTORY");
        factLib->setProperty("category", "Factory");
        juce::Array<juce::var> factPatches;
        for (const auto& factory : Core::Model::createFactoryPresets()) {
            juce::DynamicObject::Ptr p = new juce::DynamicObject();
            p->setProperty("name", juce::String(factory.name));
            p->setProperty("category", "Factory");
            p->setProperty("author", "OMEGA");
            p->setProperty("date", juce::Time::getCurrentTime().formatted("%Y-%m-%d"));
            factPatches.add(juce::var(p.get()));
        }
        factLib->setProperty("patches", factPatches);
        libraries.add(juce::var(factLib.get()));

        // --- User (disco) ---
        juce::DynamicObject::Ptr userLib = new juce::DynamicObject();
        userLib->setProperty("name", "USER PRESETS");
        userLib->setProperty("category", "User");
        juce::Array<juce::var> userPatches;
        for (const auto& info : mRepository.list()) {
            juce::DynamicObject::Ptr p = new juce::DynamicObject();
            p->setProperty("name", info.name);
            p->setProperty("category", "User");
            p->setProperty("author", info.author.isNotEmpty() ? info.author : "User");
            if (info.modifiedAt > 0)
                p->setProperty("date", juce::Time(info.modifiedAt).formatted("%Y-%m-%d"));
            userPatches.add(juce::var(p.get()));
        }
        userLib->setProperty("patches", userPatches);
        libraries.add(juce::var(userLib.get()));

        root->setProperty("libraries", libraries);

        juce::Array<juce::var> categories;
        categories.add("Factory");
        categories.add("User");
        root->setProperty("categories", categories);

        return createResponse("BROWSER_DATA", requestId, juce::var(), juce::var(root.get()));
    }

    juce::var RpcPresetController::handleDeletePreset(const juce::var& requestId, const juce::var& payload) {
        // [P2-4] Borra un preset de usuario del disco (PatchRepository::remove).
        // Los patches de fábrica son programáticos (no borrables).
        juce::String target = payload["target"].toString().trim();
        if (target.isEmpty()) {
            return createError("DELETE_FAILED", requestId, "Missing target");
        }

        if (mRepository.remove(target)) {
            return createResponse("DELETE_ACK", requestId, {}, true);
        }
        return createError("DELETE_FAILED", requestId, "Preset not found: " + target);
    }

} // namespace UI
} // namespace Omega
