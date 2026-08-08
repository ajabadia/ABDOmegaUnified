/**
 * [P1-1] Tormenta de recompilación del timer de 30 ms.
 *
 * El timer de OmegaAudioProcessor pregunta por TODOS los parámetros cada tick.
 * Antes, cada updateParameter recompilaba el snapshot incondicionalmente (N
 * compilaciones por tick aunque nada cambiara). El fix tiene dos mecanismos:
 *   (a) guard de valor idéntico en updateParameter (sin cambio real → sin
 *       recompile), y
 *   (b) modo lote (beginBatch/endBatch): el timer acumula dirty y recompila
 *       UNA sola vez al final del loop.
 *
 * Observable: recompile() alterna el puntero del snapshot entre los dos slots
 * del doble buffer (mSnapshots[0]/[1]), así que "puntero idéntico" ⇒ "no hubo
 * recompilación desde la última captura".
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>

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

    /** Harness mínimo idéntico al de EngineConfigSemanticRouting.test.cpp. */
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

} // namespace

TEST_CASE("un valor idéntico no recompila; un valor nuevo sí", "[p1-1][recompile]") {
    Harness h;
    h.registerComponent("flt_juno_ir3109", { "cutoff" });

    PatchDocument doc = h.makeDocument();
    doc.modules[0].typeId = ModuleTypeId::JunoFilter;
    h.config.applyPatch(doc);

    // Primer cambio real → recompila (el snapshot cambia de slot).
    h.config.updateParameter("layer.a.cutoff", 0.75f);
    const auto* snap = h.config.getCurrentSnapshot();
    REQUIRE(snap != nullptr);

    // [P1-1] Mismo valor → sin recompile (el puntero del doble buffer NO cambia).
    h.config.updateParameter("layer.a.cutoff", 0.75f);
    REQUIRE(h.config.getCurrentSnapshot() == snap);

    // Valor nuevo → recompile (el puntero cambia de slot).
    h.config.updateParameter("layer.a.cutoff", 0.80f);
    REQUIRE(h.config.getCurrentSnapshot() != snap);
}

TEST_CASE("globalFx y masterGainDb idénticos tampoco recompilan", "[p1-1][recompile][globalFx]") {
    Harness h;

    h.config.updateParameter("globalFx.200", 0.5f);
    const auto* snap = h.config.getCurrentSnapshot();
    h.config.updateParameter("globalFx.200", 0.5f);
    REQUIRE(h.config.getCurrentSnapshot() == snap);
    h.config.updateParameter("globalFx.200", 0.6f);
    REQUIRE(h.config.getCurrentSnapshot() != snap);

    snap = h.config.getCurrentSnapshot();
    h.config.updateParameter("LAYERAMAINVCAGAIN", -6.0f);
    REQUIRE(h.config.getCurrentSnapshot() != snap);
    snap = h.config.getCurrentSnapshot();
    h.config.updateParameter("LAYERAMAINVCAGAIN", -6.0f);
    REQUIRE(h.config.getCurrentSnapshot() == snap);
}

TEST_CASE("el lote recompila una sola vez y sin perder cambios", "[p1-1][recompile][batch]") {
    Harness h;
    h.registerComponent("flt_juno_ir3109", { "cutoff", "resonance" });

    PatchDocument doc = h.makeDocument();
    doc.modules[0].typeId = ModuleTypeId::JunoFilter;
    h.config.applyPatch(doc);

    // Dos cambios en un lote → UNA recompilación al cierre con ambos valores.
    h.config.beginBatch();
    h.config.updateParameter("layer.a.cutoff", 0.3f);     // slot 0
    h.config.updateParameter("layer.a.resonance", 0.7f);  // slot 1
    h.config.endBatch();

    const auto* snap = h.config.getCurrentSnapshot();
    REQUIRE(snap != nullptr);
    REQUIRE(snap->voicePlan.unitCount == 1);
    REQUIRE(snap->voicePlan.units[0].baseValues[0] == Catch::Approx(0.3f));
    REQUIRE(snap->voicePlan.units[0].baseValues[1] == Catch::Approx(0.7f));

    // Lote con valores idénticos → endBatch sin recompilar.
    h.config.beginBatch();
    h.config.updateParameter("layer.a.cutoff", 0.3f);
    h.config.updateParameter("layer.a.resonance", 0.7f);
    h.config.endBatch();
    REQUIRE(h.config.getCurrentSnapshot() == snap);

    // Fuera del lote, cada cambio recompila de inmediato (comportamiento previo).
    const auto* before = h.config.getCurrentSnapshot();
    h.config.updateParameter("layer.a.cutoff", 0.4f);
    REQUIRE(h.config.getCurrentSnapshot() != before);
}

TEST_CASE("endBatch sin lote y beginBatch anidado son no-ops seguros", "[p1-1][recompile][batch]") {
    Harness h;
    h.registerComponent("flt_juno_ir3109", { "cutoff" });

    PatchDocument doc = h.makeDocument();
    doc.modules[0].typeId = ModuleTypeId::JunoFilter;
    h.config.applyPatch(doc);

    // endBatch sin lote activo → no-op (sin recompile espurio).
    const auto* snap = h.config.getCurrentSnapshot();
    h.config.endBatch();
    REQUIRE(h.config.getCurrentSnapshot() == snap);

    // beginBatch anidado no resetea el dirty del lote exterior (nota revisor):
    // el cambio del lote interior sigue marcando dirty y se recompila UNA vez
    // al cierre del lote exterior.
    h.config.beginBatch();
    h.config.updateParameter("layer.a.cutoff", 0.55f);
    h.config.beginBatch(); // anidado → ignorado (no resetea dirty)
    h.config.updateParameter("layer.a.cutoff", 0.56f);
    h.config.endBatch();   // cierra el lote exterior → recompile con 0.56

    const auto* after = h.config.getCurrentSnapshot();
    REQUIRE(after != snap);
    REQUIRE(after->voicePlan.unitCount == 1);
    REQUIRE(after->voicePlan.units[0].baseValues[0] == Catch::Approx(0.56f));
}
