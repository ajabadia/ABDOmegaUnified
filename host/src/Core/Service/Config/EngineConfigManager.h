#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <atomic>

#include "../../Model/Patch/PatchDocument.h"
#include "../../Model/Runtime/RuntimeSnapshot.h"
#include "../../Compiler/Orchestration/RuntimeCompiler.h"
#include "../../Ace/Registry/AceCatalog.h"
#include "../../../Engine/Modular/VirtualAnalogEngine.h"

namespace Omega::Core::Service {

    /**
     * @brief [Era 7] Centralized Store for the Engine State.
     */
    class EngineConfigManager {
    public:
        EngineConfigManager(::Omega::Engine::Modular::VirtualAnalogEngine& engine, const Ace::AceCatalog& catalog)
            : mEngine(engine), mCatalog(catalog) {
            mCurrentSnapshot.store(&mSnapshots[0]);
        }

        void applyPatch(const Model::PatchDocument& doc) {
            mPatchDocument = doc;
            recompile();
        }

        void updateParameter(uint32_t instanceId, Model::ParamId paramId, float value) {
            // [Era 7.2.3] Los parámetros FX globales (Mix=200..Intensity=204) viven en
            // doc.globalFxParams, no en módulos. El timer (updateParameter(0, ...)) y el
            // handler de la UI llegan aquí: rutear por rango de ParamId es la fuente
            // única para ambas vías (antes el timer era un no-op silencioso).
            if (Model::isGlobalFxParamId(paramId)) {
                updateGlobalFxParameter(paramId, value);
                return;
            }

            auto* mod = const_cast<Model::ModuleInstance*>(mPatchDocument.findModule(instanceId));
            if (mod) {
                bool found = false;
                for (auto& p : mod->parameters) {
                    if (p.id == paramId) { p.value = value; found = true; break; }
                }
                if (!found) mod->parameters.push_back({paramId, value});
                recompile();
            }
        }

        /**
         * @brief Actualiza un parámetro FX global (doc.globalFxParams) y recompila.
         * Usado por el handler `globalFx.<id>` de la UI y por el routing del timer.
         */
        void updateGlobalFxParameter(Model::ParamId paramId, float value) {
            auto& params = mPatchDocument.globalFxParams;
            bool found = false;
            for (auto& p : params) {
                if (p.id == paramId) { p.value = value; found = true; break; }
            }
            if (!found) params.push_back({ paramId, value, 0 });
            recompile();
        }

        void updateParameter(const juce::String& paramName, float value) {
            if (paramName == "LAYERAMAINVCAGAIN") {
                mPatchDocument.masterGainDb = value;
                recompile();
                return;
            }
        }

        void recompile();

        const Model::RuntimeSnapshot* getCurrentSnapshot() const { return mCurrentSnapshot.load(); }
        const Model::PatchDocument& getPatchDocument() const { return mPatchDocument; }

        /**
         * @brief Acceso mutable a los slots del Patchbay Matrix (persistidos en el PatchDocument).
         */
        std::vector<Model::PatchbayMatrixSlot>& patchbayMatrix() { return mPatchDocument.patchbayMatrix; }

    private:
        ::Omega::Engine::Modular::VirtualAnalogEngine& mEngine;
        const Ace::AceCatalog& mCatalog;
        
        Model::PatchDocument mPatchDocument;
        Model::RuntimeSnapshot mSnapshots[2];
        std::atomic<Model::RuntimeSnapshot*> mCurrentSnapshot;
    };

} // namespace Omega::Core::Service
