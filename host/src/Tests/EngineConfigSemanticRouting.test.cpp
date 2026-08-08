/**
 * [Era 8.1] Routing semántico → PatchDocument en EngineConfigManager.
 *
 * El timer de OmegaAudioProcessor llamaba updateParameter(0, (ParamId)idx, val):
 * idx era el índice del std::map del registro (orden alfabético, no un ParamId)
 * e instanceId=0 no resolvía ningún módulo → no-op silencioso.
 *
 * La vía corregida pasa los IDs string del registro al overload
 * updateParameter(const juce::String&, float). Este test verifica que ese
 * overload resuelve la clave al (tipo de módulo, slot del catálogo) correcto,
 * delega en el overload numérico con ParamId local = slotIdx+1
 * (contrato de RuntimeCompiler.cpp:44) y llega hasta el snapshot compilado.
 */
#include <catch2/catch_test_macros.hpp>

#include "AceCatalog.h"
#include "VirtualAnalogEngine.h"
#include "SystemSettingsManager.h"
#include "EngineConfigManager.h"
#include "PatchDocument.h"
#include "PatchIdentifiers.h"

using namespace Omega::Core::Model;

namespace {

    using Omega::Core::Ace::AceCatalog;
    using Omega::Core::Ace::ComponentInfo;
    using Omega::Core::Ace::ParameterDef;
    using Omega::Core::Service::EngineConfigManager;
    using Omega::Core::Service::SystemSettingsManager;

    /** Harness mínimo idéntico al de RpcGetStateIntegration.test.cpp. */
    struct Harness {
        AceCatalog catalog;
        SystemSettingsManager settings;
        ::Omega::Engine::Modular::VirtualAnalogEngine engine;
        EngineConfigManager config;

        Harness() : engine(settings), config(engine, catalog) {}

        void registerComponent(const std::string& id, const std::vector<std::string>& leafIds) {
            ComponentInfo info;
            info.id = id;
            info.name = id;
            info.modelId = id;
            info.family = "test";
            info.engine = "va";
            info.implementationId = 1;
            for (const auto& leaf : leafIds) {
                ParameterDef p;
                p.id = leaf;
                p.label = leaf;
                p.min = 0.0f;
                p.max = 1.0f;
                p.defaultValue = 0.5f;
                p.front = true;
                info.parameters.push_back(p);
            }
            catalog.registerComponent(info);
        }

        PatchDocument makeDocument() {
            PatchDocument doc;
            ModuleInstance mod;
            mod.instanceId = 3;
            doc.modules.push_back(mod);
            return doc;
        }
    };

    const ParamValue* findParam(const std::vector<ParamValue>& params, uint16_t id) {
        for (const auto& p : params)
            if (static_cast<uint16_t>(p.id) == id) return &p;
        return nullptr;
    }

} // namespace

TEST_CASE("layer.a.cutoff se enruta al módulo JunoFilter con ParamId del slot", "[semantic][routing][vcf]") {
    Harness h;
    h.registerComponent("flt_juno_ir3109", { "cutoff", "resonance" });

    PatchDocument doc = h.makeDocument();
    doc.modules[0].typeId = ModuleTypeId::JunoFilter;
    h.config.applyPatch(doc);

    h.config.updateParameter("layer.a.cutoff", 0.75f);

    const auto& out = h.config.getPatchDocument();
    REQUIRE(out.modules.size() == 1);
    REQUIRE(out.modules[0].instanceId == 3);

    // cutoff es el slot 0 → ParamId local = 1 (RuntimeCompiler.cpp:44)
    const auto* p = findParam(out.modules[0].parameters, 1);
    REQUIRE(p != nullptr);
    REQUIRE(p->value == 0.75f);

    // El snapshot compilado debe reflejar el valor en el slot 0.
    const auto* snap = h.config.getCurrentSnapshot();
    REQUIRE(snap != nullptr);
    REQUIRE(snap->voicePlan.unitCount == 1);
    REQUIRE(snap->voicePlan.units[0].implementationId == 1);
    REQUIRE(snap->voicePlan.units[0].baseValues[0] == 0.75f);
}

TEST_CASE("el routing es agnóstico al orden de slots del catálogo", "[semantic][routing][vcf]") {
    Harness h;
    h.registerComponent("flt_juno_ir3109", { "resonance", "cutoff" });

    PatchDocument doc = h.makeDocument();
    doc.modules[0].typeId = ModuleTypeId::JunoFilter;
    h.config.applyPatch(doc);

    h.config.updateParameter("layer.a.cutoff", 0.25f);

    // cutoff ahora es el slot 1 → ParamId local = 2
    const auto* p = findParam(h.config.getPatchDocument().modules[0].parameters, 2);
    REQUIRE(p != nullptr);
    REQUIRE(p->value == 0.25f);
}

TEST_CASE("layer.a.env.release se enruta al módulo EnvelopeAdsr", "[semantic][routing][env]") {
    Harness h;
    h.registerComponent("env_adsr_va", { "attack", "decay", "sustain", "release" });

    PatchDocument doc = h.makeDocument();
    doc.modules[0].typeId = ModuleTypeId::EnvelopeAdsr;
    h.config.applyPatch(doc);

    h.config.updateParameter("layer.a.env.release", 0.4f);

    // release es el slot 3 → ParamId local = 4
    const auto* p = findParam(h.config.getPatchDocument().modules[0].parameters, 4);
    REQUIRE(p != nullptr);
    REQUIRE(p->value == 0.4f);

    const auto* snap = h.config.getCurrentSnapshot();
    REQUIRE(snap->voicePlan.unitCount == 1);
    REQUIRE(snap->voicePlan.units[0].baseValues[3] == 0.4f);
}

TEST_CASE("globalFx.200 via string overload actualiza globalFxParams", "[semantic][routing][globalFx]") {
    Harness h;
    h.config.updateParameter("globalFx.200", 0.5f);

    const auto& out = h.config.getPatchDocument();
    REQUIRE(out.globalFxParams.size() == 1);
    REQUIRE(out.globalFxParams[0].id == ParamId::Mix);
    REQUIRE(out.globalFxParams[0].value == 0.5f);
}

TEST_CASE("LAYERAMAINVCAGAIN actualiza masterGainDb", "[semantic][routing][master]") {
    Harness h;
    h.config.updateParameter("LAYERAMAINVCAGAIN", -6.0f);
    REQUIRE(h.config.getPatchDocument().masterGainDb == -6.0f);
}

TEST_CASE("claves sin ruta o sin módulo son no-ops seguros", "[semantic][routing][safety]") {
    Harness h;
    h.registerComponent("flt_juno_ir3109", { "cutoff" });

    // Sin módulo JunoFilter en el doc → no-op
    PatchDocument doc = h.makeDocument(); // typeId por defecto (no JunoFilter)
    h.config.applyPatch(doc);
    h.config.updateParameter("layer.a.cutoff", 0.9f);
    REQUIRE(h.config.getPatchDocument().modules[0].parameters.empty());

    // Clave semántica sin ruta → no-op
    h.config.updateParameter("layer.a.vca.mode", 1.0f);
    REQUIRE(h.config.getPatchDocument().modules[0].parameters.empty());

    // Clave infra sin ruta → no-op
    h.config.updateParameter("midi.channel", 1.0f);
    REQUIRE(h.config.getPatchDocument().modules[0].parameters.empty());
}
