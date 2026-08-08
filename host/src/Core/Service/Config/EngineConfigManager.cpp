#include "EngineConfigManager.h"

#include <map>
#include <string>

namespace Omega::Core::Service {

    namespace {

        using Model::ModuleTypeId;

        /**
         * @brief [Era 8.1] Ruta semántica → PatchDocument.
         * Clave del registro ("layer.a.cutoff", ...) → (tipo de módulo, slot del
         * catálogo). Los slots (leaf) coinciden con los ParameterDef.id del
         * catálogo y con los IDs::* de OmegaIdentifiers.h.
         */
        struct SemanticRoute {
            ModuleTypeId type;
            const char* leaf;
        };

        const std::map<std::string, SemanticRoute>& semanticRoutes() {
            // [P1-3] CONTRATO DUPLICADO: RuntimeCompiler::resolveVoiceConfigCutoff
            // re-deriva la ruta "layer.a.cutoff" → JunoFilter/"cutoff" (el compiler
            // es una función pura y no toca este singleton). Si se añade una ruta
            // de cutoff a otro filtro (Korg/Jp), actualizar AMBOS sitios.
            static const std::map<std::string, SemanticRoute> routes = {
                // VCF — flt_juno_ir3109
                { "layer.a.cutoff",        { ModuleTypeId::JunoFilter, "cutoff" } },
                { "layer.a.resonance",     { ModuleTypeId::JunoFilter, "resonance" } },
                { "layer.a.hpf.pos",       { ModuleTypeId::JunoFilter, "hpfPosition" } },
                { "layer.a.vcf.env.depth", { ModuleTypeId::JunoFilter, "vcfEnvDepth" } },
                { "layer.a.vcf.lfo.depth", { ModuleTypeId::JunoFilter, "vcfModDepth" } },
                { "layer.a.vcf.keytrack",  { ModuleTypeId::JunoFilter, "vcfKeyTracking" } },
                { "layer.a.vcf.env.inv",   { ModuleTypeId::JunoFilter, "vcfEnvInverted" } },

                // Oscilador — osc_va_basic
                { "layer.a.osc.saw.on",       { ModuleTypeId::VaOscillator, "sawOn" } },
                { "layer.a.osc.pulse.on",     { ModuleTypeId::VaOscillator, "pulseOn" } },
                { "layer.a.osc.sub.level",    { ModuleTypeId::VaOscillator, "subLevel" } },
                { "layer.a.osc.noise.level",  { ModuleTypeId::VaOscillator, "noiseLevel" } },
                { "layer.a.osc.pwm.mode",     { ModuleTypeId::VaOscillator, "pwmMode" } },
                { "layer.a.osc.pwm.amount",   { ModuleTypeId::VaOscillator, "pwmAmount" } },
                { "layer.a.dco.lfo.depth",    { ModuleTypeId::VaOscillator, "dcoLfoDepth" } },
                { "layer.a.drift",            { ModuleTypeId::VaOscillator, "analogDrift" } },

                // Envolvente — env_adsr_va
                { "layer.a.env.attack",   { ModuleTypeId::EnvelopeAdsr, "attack" } },
                { "layer.a.env.decay",    { ModuleTypeId::EnvelopeAdsr, "decay" } },
                { "layer.a.env.sustain",  { ModuleTypeId::EnvelopeAdsr, "sustain" } },
                { "layer.a.env.release",  { ModuleTypeId::EnvelopeAdsr, "release" } },

                // LFO — lfo_va_basic
                { "layer.a.lfo.rate",     { ModuleTypeId::LfoVA, "lfoRate" } },
                { "layer.a.lfo.wave",     { ModuleTypeId::LfoVA, "lfoWave" } },

                // Chorus global — fx_chorus_juno
                { "global.chorus.mode",   { ModuleTypeId::ChorusPool, "mode" } },
                { "global.chorus.mix",    { ModuleTypeId::ChorusPool, "levelDb" } },
            };
            return routes;
        }

    } // namespace

    void EngineConfigManager::recompile() {
        auto nextIdx = (mCurrentSnapshot.load() == &mSnapshots[0]) ? 1 : 0;
        mSnapshots[nextIdx] = Compiler::RuntimeCompiler::compile(mPatchDocument, mCatalog);
        
        mCurrentSnapshot.store(&mSnapshots[nextIdx]);
        mEngine.pushConfigUpdate(); // Notify audio thread
    }

    bool EngineConfigManager::routeSemanticParameter(const std::string& key, float value) {
        const auto& routes = semanticRoutes();
        const auto routeIt = routes.find(key);
        if (routeIt == routes.end()) return false;

        const Model::ModuleInstance* target = nullptr;
        for (const auto& mod : mPatchDocument.modules) {
            if (mod.typeId == routeIt->second.type) {
                target = &mod;
                break;
            }
        }
        if (target == nullptr) return false;

        const Ace::ComponentInfo* info = mCatalog.getComponent(Model::mapTypeToId(routeIt->second.type));
        if (info == nullptr) return false;

        for (size_t slot = 0; slot < info->parameters.size(); ++slot) {
            if (info->parameters[slot].id == routeIt->second.leaf) {
                // [Era 8.1] ParamId local = índice de slot del catálogo + 1
                // (contrato de RuntimeCompiler.cpp:44).
                updateParameter(target->instanceId, static_cast<Model::ParamId>(slot + 1), value);
                return true;
            }
        }
        return false;
    }

} // namespace Omega::Core::Service
