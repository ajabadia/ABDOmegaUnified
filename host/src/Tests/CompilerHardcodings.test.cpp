/**
 * [P1-3] Hardcodings del RuntimeCompiler: snapshotId/planId deterministas,
 * cutoff real propagado del patch y amount de conexión desde el Patchbay Matrix.
 *
 * Diagnóstico original: compile() fijaba snapshotId=1234 (falso, planId nunca
 * rellenado), voiceConfig.cutoff=2000.0f ignorando el cutoff del patch
 * (ruta "layer.a.cutoff" → módulo JunoFilter) y cc.amount=1.0f ignorando el
 * amount de la conexión (PatchbayMatrixSlot, IDs "instanceId.portId").
 *
 * Este test fija las invariantes: los IDs derivan del contenido (deterministas
 * y sensibles a cualquier cambio), el cutoff del documento llega al VoiceConfig
 * y el amount del slot activo se propaga a la conexión compilada.
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>

#include "AceCatalog.h"
#include "RuntimeCompiler.h"
#include "PatchDocument.h"
#include "PatchIdentifiers.h"
#include "CompiledVoicePlan.h"
#include "ModPortTypes.h"
#include "ModuleManifest.h"

using namespace Omega::Core::Model;
using namespace Omega::Core::Ace;
using namespace Omega::Core::Modulation;

namespace {

    using Omega::Core::Compiler::RuntimeCompiler;
    using Omega::Core::Voice::CompiledVoicePlan;

    ComponentInfo makeComponent(const std::string& id,
                                const std::vector<std::string>& leafParams = {},
                                const std::vector<std::pair<ModPortType, bool>>& ports = {}) {
        ComponentInfo info;
        info.id = id;
        info.name = id;
        info.modelId = id;
        info.family = "test";
        info.engine = "WASM";
        info.implementationId = 1;
        for (const auto& leaf : leafParams) {
            ParameterDef p;
            p.id = leaf;
            p.label = leaf;
            p.min = 20.0f;
            p.max = 20000.0f;
            p.defaultValue = 2000.0f;
            p.front = true;
            info.parameters.push_back(p);
        }
        for (const auto& [type, isInput] : ports) {
            // [P1-3] Convención real del ecosistema: los puertos del catálogo
            // tienen nombres ("out", "in", "cutoff_cv"...) y el patchbayMatrix
            // los usa como "instanceId.portName". Nombres realistas fijan la
            // correlación de resolveConnectionAmount, no genéricos "portN".
            PortDescriptor p;
            p.id = (id == "osc_va_basic" && info.ports.empty()) ? "out"
                : (id == "flt_juno_ir3109" && info.ports.empty()) ? "in"
                : "cutoff_cv";
            p.type = type;
            p.isInput = isInput;
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

} // namespace

TEST_CASE("snapshotId y planId son deterministas y cambian con el contenido", "[compiler][p1-3][hash]") {
    AceCatalog catalog;
    catalog.registerComponent(makeComponent("flt_juno_ir3109", { "cutoff", "resonance" }));

    PatchDocument doc;
    doc.modules.push_back(makeModule(3, ModuleTypeId::JunoFilter));
    doc.modules[0].parameters = { { static_cast<ParamId>(1), 7500.0f, 0 } }; // cutoff slot 0

    const auto s1 = RuntimeCompiler::compile(doc, catalog);
    const auto s2 = RuntimeCompiler::compile(doc, catalog);

    // Determinista: misma entrada → mismo ID (y nunca el falso 1234).
    REQUIRE(s1.snapshotId != 0);
    REQUIRE(s1.snapshotId != 1234);
    REQUIRE(s1.snapshotId == s2.snapshotId);
    REQUIRE(s1.voicePlan.planId == s2.voicePlan.planId);
    REQUIRE(s1.voicePlan.planId != 0);

    // Sensible al contenido: cambiar el cutoff del patch cambia ambos IDs.
    PatchDocument doc2 = doc;
    doc2.modules[0].parameters[0].value = 8000.0f;
    const auto s3 = RuntimeCompiler::compile(doc2, catalog);
    REQUIRE(s3.snapshotId != s1.snapshotId);
    REQUIRE(s3.voicePlan.planId != s1.voicePlan.planId);

    // Sensible a la topología: añadir un módulo cambia el ID.
    PatchDocument doc3 = doc;
    doc3.modules.push_back(makeModule(4, ModuleTypeId::VaOscillator));
    const auto s4 = RuntimeCompiler::compile(doc3, catalog);
    REQUIRE(s4.snapshotId != s1.snapshotId);
}

TEST_CASE("voiceConfig.cutoff se propaga desde el módulo JunoFilter (ruta layer.a.cutoff)", "[compiler][p1-3][vcf]") {
    AceCatalog catalog;
    catalog.registerComponent(makeComponent("flt_juno_ir3109", { "cutoff", "resonance" }));

    // cutoff es el slot 0 → ParamId local = 1 (contrato RuntimeCompiler :44).
    PatchDocument doc;
    doc.modules.push_back(makeModule(3, ModuleTypeId::JunoFilter));
    doc.modules[0].parameters = { { static_cast<ParamId>(1), 7500.0f, 0 } };

    const auto snap = RuntimeCompiler::compile(doc, catalog);
    REQUIRE(snap.voiceConfig.cutoff == Catch::Approx(7500.0f));

    // Sin el parámetro en el módulo → defaultValue del catálogo (2000).
    PatchDocument docDefault;
    docDefault.modules.push_back(makeModule(3, ModuleTypeId::JunoFilter));
    const auto snapDefault = RuntimeCompiler::compile(docDefault, catalog);
    REQUIRE(snapDefault.voiceConfig.cutoff == Catch::Approx(2000.0f));

    // Sin módulo de filtro en el rack → default VoiceConfig (2000).
    PatchDocument docNoFilter;
    const auto snapNoFilter = RuntimeCompiler::compile(docNoFilter, catalog);
    REQUIRE(snapNoFilter.voiceConfig.cutoff == Catch::Approx(2000.0f));
}

TEST_CASE("cc.amount se propaga desde el Patchbay Matrix activo (nombres reales)", "[compiler][p1-3][cables]") {
    AceCatalog catalog;
    // Fuente: puerto 0 = "out". Destino: puerto 0 = "in", puerto 1 = "cutoff_cv".
    catalog.registerComponent(makeComponent("osc_va_basic", {}, { { ModPortType::Audio, false } }));
    catalog.registerComponent(makeComponent("flt_juno_ir3109", { "cutoff" }, { { ModPortType::Audio, true }, { ModPortType::CV, true } }));

    PatchDocument doc;
    doc.modules.push_back(makeModule(1, ModuleTypeId::VaOscillator));
    doc.modules.push_back(makeModule(2, ModuleTypeId::JunoFilter));
    doc.connections.push_back({ 1, 0, 2, 1, ConnectionType::Audio });

    // Sin slot activo → amount 1.0 (default histórico).
    const auto snapNoSlot = RuntimeCompiler::compile(doc, catalog);
    REQUIRE(snapNoSlot.voicePlan.connectionCount == 1);
    REQUIRE(snapNoSlot.voicePlan.connections[0].amount == Catch::Approx(1.0f));

    // Slot activo correlacionado "1.out"→"2.cutoff_cv" con amount 0.6.
    doc.patchbayMatrix.push_back({ "1.out", "2.cutoff_cv", 0.6f, "", 0.0f, true, "" });
    const auto snapSlot = RuntimeCompiler::compile(doc, catalog);
    REQUIRE(snapSlot.voicePlan.connections[0].amount == Catch::Approx(0.6f));

    // Slot inactivo → se ignora (amount 1.0).
    doc.patchbayMatrix[0].active = false;
    const auto snapInactive = RuntimeCompiler::compile(doc, catalog);
    REQUIRE(snapInactive.voicePlan.connections[0].amount == Catch::Approx(1.0f));

    // Slot de OTRO par de puertos → no correlaciona (amount 1.0).
    doc.patchbayMatrix[0] = { "1.out", "2.cutoff_cv", 0.9f, "", 0.0f, true, "" };
    doc.patchbayMatrix.push_back({ "9.out", "8.cutoff_cv", 0.3f, "", 0.0f, true, "" });
    const auto snapOther = RuntimeCompiler::compile(doc, catalog);
    REQUIRE(snapOther.voicePlan.connections[0].amount == Catch::Approx(0.9f));
}
