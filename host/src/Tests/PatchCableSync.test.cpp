/**
 * [P2-x] Sincronización cables ↔ matrix (bidireccional) + derivación del grafo
 * de audio desde el Patchbay Matrix.
 *
 * Diagnóstico del revisor: doc.connections solo se puebla vía round-trip de
 * VarSerialization — los cables reales de la UI viven en patchbayMatrix con IDs
 * "instanceId.portId" y nunca llegan al grafo de audio del CompiledVoicePlan
 * (connectionCount = 0 en uso real → los cables del usuario no enrutaban audio).
 *
 * Este test fija las invariantes de la sincronización:
 *   1. Matrix → grafo: los slots ACTIVOS con ambos puertos Audio derivan
 *      PatchConnection(Audio) con srcBus/dstBus = índices de puerto y el amount
 *      del slot (ruta primaria). CV/Gate/MIDI no entran al grafo de audio.
 *   2. Las conexiones explícitas de un patch guardado mandan (sin doble enrutado).
 *   3. Grupos de I/O — lado "eliminar": pruneOrphanedMatrixSlots limpia slots
 *      (source/target/via) y conexiones que referencian un módulo eliminado.
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>

#include "AceCatalog.h"
#include "RuntimeCompiler.h"
#include "PatchDocument.h"
#include "PatchIdentifiers.h"
#include "PatchCableSync.h"
#include "ModPortTypes.h"
#include "ModuleManifest.h"

using namespace Omega::Core::Model;
using namespace Omega::Core::Ace;
using namespace Omega::Core::Modulation;

namespace {

    using Omega::Core::Compiler::RuntimeCompiler;
    using Omega::Core::Voice::CompiledVoicePlan;

    /** Catálogo sintético con puertos NOMBRADOS (convención real "out"/"in"). */
    ComponentInfo makeComponent(const std::string& id,
                                const std::vector<std::pair<std::string, std::pair<ModPortType, bool>>>& ports) {
        ComponentInfo info;
        info.id = id;
        info.name = id;
        info.modelId = id;
        info.family = "test";
        info.engine = "WASM";
        info.implementationId = 1;
        for (const auto& [name, typeAndDir] : ports) {
            PortDescriptor p;
            p.id = name;
            p.type = typeAndDir.first;
            p.isInput = typeAndDir.second;
            info.ports.push_back(p);
        }
        return info;
    }

    ModuleInstance makeModule(uint32_t instanceId, ModuleTypeId typeId) {
        ModuleInstance mod;
        mod.instanceId = instanceId;
        mod.typeId = typeId;
        mod.position.rack = 0;
        mod.position.slot = static_cast<int16_t>(instanceId);
        mod.position.order = static_cast<int16_t>(instanceId);
        return mod;
    }

    /** Rack sintético: 1 osc (audio out), 2 flt (audio in + CV in), 3 lfo (CV out). */
    AceCatalog makeRackCatalog() {
        AceCatalog catalog;
        catalog.registerComponent(makeComponent("osc_va_basic",
            { { "out", { ModPortType::Audio, false } } }));
        catalog.registerComponent(makeComponent("flt_juno_ir3109",
            { { "in", { ModPortType::Audio, true } },
              { "cutoff_cv", { ModPortType::CV, true } } }));
        catalog.registerComponent(makeComponent("lfo_va_basic",
            { { "rate_out", { ModPortType::CV, false } } }));
        return catalog;
    }

    PatchDocument makeRackDoc() {
        PatchDocument doc;
        doc.modules.push_back(makeModule(1, ModuleTypeId::VaOscillator));
        doc.modules.push_back(makeModule(2, ModuleTypeId::JunoFilter));
        doc.modules.push_back(makeModule(3, ModuleTypeId::LfoVA));
        return doc;
    }

    PatchbayMatrixSlot makeSlot(std::string source, std::string target,
                                float amount = 1.0f, bool active = true,
                                std::string via = "") {
        return { std::move(source), std::move(target), amount,
                 std::move(via), 0.0f, active, "" };
    }

} // namespace

TEST_CASE("Los cables audio del patchbayMatrix derivan conexiones del grafo de audio", "[p2][cables][sync]") {
    auto catalog = makeRackCatalog();
    auto doc = makeRackDoc();
    doc.patchbayMatrix.push_back(makeSlot("1.out", "2.in", 0.75f));

    const auto snap = RuntimeCompiler::compile(doc, catalog);

    // El cable del usuario ahora ENRUTA audio (antes connectionCount = 0).
    REQUIRE(snap.voicePlan.connectionCount == 1);
    const auto& cc = snap.voicePlan.connections[0];
    REQUIRE(cc.fromUnit == 0);            // osc = unidad 0
    REQUIRE(cc.toUnit == 1);              // flt = unidad 1
    REQUIRE(cc.srcBus == 0);              // "out" es el puerto 0 del catálogo
    REQUIRE(cc.dstBus == 0);              // "in" es el puerto 0 del catálogo
    REQUIRE(cc.amount == Catch::Approx(0.75f)); // amount del slot (ruta primaria)
}

TEST_CASE("Solo cables audio→audio entran al grafo (CV/Gate/MIDI se excluyen)", "[p2][cables][sync]") {
    auto catalog = makeRackCatalog();
    auto doc = makeRackDoc();

    // CV→CV (lfo → cutoff_cv): modulación, NO audio.
    doc.patchbayMatrix = { makeSlot("3.rate_out", "2.cutoff_cv", 0.5f) };
    REQUIRE(RuntimeCompiler::compile(doc, catalog).voicePlan.connectionCount == 0);

    // Audio→CV (osc → cutoff_cv): mezcla ilegal para el grafo de audio.
    doc.patchbayMatrix = { makeSlot("1.out", "2.cutoff_cv", 0.5f) };
    REQUIRE(RuntimeCompiler::compile(doc, catalog).voicePlan.connectionCount == 0);

    // CV→Audio (lfo → in): no.
    doc.patchbayMatrix = { makeSlot("3.rate_out", "2.in", 0.5f) };
    REQUIRE(RuntimeCompiler::compile(doc, catalog).voicePlan.connectionCount == 0);
}

TEST_CASE("Slots inactivos, puertos desconocidos o instancias ausentes no derivan", "[p2][cables][sync]") {
    auto catalog = makeRackCatalog();
    auto doc = makeRackDoc();

    // Inactivo → no deriva.
    doc.patchbayMatrix = { makeSlot("1.out", "2.in", 0.5f, /*active=*/false) };
    REQUIRE(RuntimeCompiler::compile(doc, catalog).voicePlan.connectionCount == 0);

    // Puerto que no existe en el catálogo → se salta (fallback seguro).
    doc.patchbayMatrix = { makeSlot("1.out", "2.nope", 0.5f) };
    REQUIRE(RuntimeCompiler::compile(doc, catalog).voicePlan.connectionCount == 0);

    // Instancia ausente → se salta.
    doc.patchbayMatrix = { makeSlot("7.out", "2.in", 0.5f) };
    REQUIRE(RuntimeCompiler::compile(doc, catalog).voicePlan.connectionCount == 0);
}

TEST_CASE("Slots duplicados del mismo par audio no enrutan dos veces (dedup)", "[p2][cables][sync][dedup]") {
    auto catalog = makeRackCatalog();
    auto doc = makeRackDoc();

    // Dos slots activos con el MISMO par audio→audio (matrix corrupta o preset):
    // el grafo debe tener UNA sola conexión (el segundo slot se ignora).
    doc.patchbayMatrix = {
        makeSlot("1.out", "2.in", 0.6f),
        makeSlot("1.out", "2.in", 0.9f),
    };

    const auto snap = RuntimeCompiler::compile(doc, catalog);
    REQUIRE(snap.voicePlan.connectionCount == 1);
    REQUIRE(snap.voicePlan.connections[0].amount == Catch::Approx(0.6f)); // primer slot manda

    // Y pares DISTINTOS sí compilan ambos.
    doc.patchbayMatrix = {
        makeSlot("1.out", "2.in", 0.6f),
        makeSlot("3.rate_out", "2.cutoff_cv", 0.5f), // CV → no entra al grafo
    };
    REQUIRE(RuntimeCompiler::compile(doc, catalog).voicePlan.connectionCount == 1);
}

TEST_CASE("Las conexiones explícitas de un patch guardado mandan (sin doble enrutado)", "[p2][cables][sync]") {
    auto catalog = makeRackCatalog();
    auto doc = makeRackDoc();

    // Explícita + slot de matrix para el MISMO par: debe compilar UNA sola
    // conexión (la derivación se salta si doc.connections no está vacío).
    doc.connections.push_back({ 1, 0, 2, 0, ConnectionType::Audio });
    doc.patchbayMatrix.push_back(makeSlot("1.out", "2.in", 0.5f));

    const auto snap = RuntimeCompiler::compile(doc, catalog);
    REQUIRE(snap.voicePlan.connectionCount == 1);
    // El amount sigue correlacionándose con la matrix (P1-3, ruta primaria).
    REQUIRE(snap.voicePlan.connections[0].amount == Catch::Approx(0.5f));
}

TEST_CASE("pruneOrphanedMatrixSlots elimina slots y conexiones del módulo removido", "[p2][cables][sync][prune]") {
    PatchDocument doc;
    doc.patchbayMatrix = {
        makeSlot("1.out", "2.in"),        // refs 2 → se elimina
        makeSlot("2.out", "3.in"),        // refs 2 → se elimina
        makeSlot("1.out", "3.in", 1.0f, true, "2.in"), // via refs 2 → se elimina
        makeSlot("1.out", "3.in"),        // refs 3 → se conserva
    };
    doc.connections = {
        { 1, 0, 2, 0, ConnectionType::Audio }, // refs 2 → se elimina
        { 2, 0, 3, 0, ConnectionType::Audio }, // refs 2 → se elimina
        { 1, 0, 3, 0, ConnectionType::Audio }, // se conserva
    };

    pruneOrphanedMatrixSlots(doc, 2);

    REQUIRE(doc.patchbayMatrix.size() == 1);
    REQUIRE(doc.patchbayMatrix[0].source == "1.out");
    REQUIRE(doc.patchbayMatrix[0].target == "3.in");
    REQUIRE(doc.connections.size() == 1);
    REQUIRE(doc.connections[0].sourceModuleId == 1);
    REQUIRE(doc.connections[0].targetModuleId == 3);
}

TEST_CASE("Los IDs legacy no numéricos de la matrix no se correlacionan al prunear", "[p2][cables][sync][prune]") {
    PatchDocument doc;
    doc.patchbayMatrix = {
        { "osc1.freq", "flt.cutoff", 0.0f, "", 0.0f, true, "" }, // legacy → se conserva
        makeSlot("5.out", "6.in"),                                // refs 6 → se elimina
    };

    pruneOrphanedMatrixSlots(doc, 6);

    REQUIRE(doc.patchbayMatrix.size() == 1);
    REQUIRE(doc.patchbayMatrix[0].source == "osc1.freq");
}
