#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <atomic>
#include <string>

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
            // [Era 8.1] Wire the double-buffered snapshot into the audio thread
            // so recompile() actually takes effect at render time.
            mEngine.setConfigProvider(&mCurrentSnapshot);
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
                    if (p.id == paramId) {
                        // [P1-1] Valor idéntico → sin cambio real, no recompilar.
                        // El timer pregunta cada 30 ms; antes esto recompilaba el
                        // snapshot N veces por tick sin ningún cambio.
                        if (p.value == value) return;
                        p.value = value; found = true; break;
                    }
                }
                if (!found) mod->parameters.push_back({paramId, value});
                markDirty();
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
                if (p.id == paramId) {
                    // [P1-1] Guard de valor idéntico (ver updateParameter).
                    if (p.value == value) return;
                    p.value = value; found = true; break;
                }
            }
            if (!found) params.push_back({ paramId, value, 0 });
            markDirty();
        }

        void updateParameter(const juce::String& paramName, float value) {
            if (paramName == "LAYERAMAINVCAGAIN") {
                // [P1-1] Guard de valor idéntico (ver updateParameter).
                if (mPatchDocument.masterGainDb == value) return;
                mPatchDocument.masterGainDb = value;
                markDirty();
                return;
            }

            // [Era 8.1] Convención wire `globalFx.<id>` (Mix=200..Intensity=204):
            // el timer y el handler de la UI llegan aquí con la misma ruta.
            const Model::ParamId fxId = Model::getGlobalFxParamId(paramName.toStdString());
            if (fxId != Model::ParamId::None) {
                updateGlobalFxParameter(fxId, value);
                return;
            }

            // [Era 8.1] Routing semántico (layer.a.*, global.chorus.*) hacia el
            // PatchDocument: módulo del tipo adecuado + slot del catálogo.
            if (routeSemanticParameter(paramName.toStdString(), value)) return;

            // Claves sin destino (midi.*, layer.a.vca.mode, ...) → no-op.
        }

        /**
         * @brief [P1-1] Modo lote: acumula cambios en el documento SIN recompilar
         * por parámetro y recompila UNA sola vez al cerrar el lote si hubo algún
         * cambio real. El timer de 30 ms envuelve su loop con beginBatch/endBatch
         * (antes: N recompilaciones por tick, aunque nada cambiara).
         * Fuera de un lote el comportamiento es el de siempre (recompilación
         * inmediata por cada cambio).
         */
        void beginBatch() {
            // Nota del revisor: un beginBatch anidado es un no-op (no resetea el
            // dirty del lote exterior) — antes resetearía mBatchDirty y perdería
            // la recompilación pendiente del lote de más afuera.
            if (mBatchActive) return;
            mBatchActive = true;
            mBatchDirty = false;
        }
        void endBatch() {
            if (!mBatchActive) return; // No-op defensivo (endBatch sin beginBatch)
            mBatchActive = false;
            if (mBatchDirty) recompile();
        }

        void recompile();

        const Model::RuntimeSnapshot* getCurrentSnapshot() const { return mCurrentSnapshot.load(); }
        const Model::PatchDocument& getPatchDocument() const { return mPatchDocument; }

        /**
         * @brief Acceso mutable a los slots del Patchbay Matrix (persistidos en el PatchDocument).
         */
        std::vector<Model::PatchbayMatrixSlot>& patchbayMatrix() { return mPatchDocument.patchbayMatrix; }

    private:
        /**
         * @brief [P1-1] Marca el snapshot como sucio. En modo lote solo activa el
         * flag (endBatch recompila); fuera del lote recompila inmediatamente.
         * Este es el ÚNICO punto que decide cuándo recompilar tras una mutación.
         */
        void markDirty() {
            if (mBatchActive) mBatchDirty = true;
            else recompile();
        }

        /**
         * @brief [Era 8.1] Resuelve una clave semántica del registro
         * ("layer.a.cutoff", "global.chorus.mix", ...) a (tipo de módulo, slot
         * del catálogo) y delega en updateParameter(instanceId, ParamId, value).
         * Devuelve false si la clave no tiene ruta, no hay módulo destino o el
         * slot no existe en el catálogo.
         */
        bool routeSemanticParameter(const std::string& key, float value);

        ::Omega::Engine::Modular::VirtualAnalogEngine& mEngine;
        const Ace::AceCatalog& mCatalog;
        
        Model::PatchDocument mPatchDocument;
        Model::RuntimeSnapshot mSnapshots[2];
        std::atomic<Model::RuntimeSnapshot*> mCurrentSnapshot;

        // [P1-1] Estado del modo lote del timer (acumula dirty sin recompilar).
        bool mBatchActive = false;
        bool mBatchDirty = false;
    };

} // namespace Omega::Core::Service
