/**
 * [P0-2] Puente MIDI modular: sistema → midi_in → bus → midiTargets.
 *
 * Arquitectura (feedback del usuario): OMEGA es modular — los módulos, excepto
 * midi_in, reciben el MIDI desde OTROS módulos vía cables, no del sistema. El
 * MIDI del DAW/teclado solo entra por el módulo midi_in; el rack sin midi_in
 * no recibe notas (modular puro).
 *
 * Este test fija las invariantes del puente:
 *  1. RuntimeCompiler rellena `midiTargets` con las unidades cuyo módulo del
 *     catálogo tiene un puerto ModPortType::MIDI input (p. ej. omega_lab_monitor).
 *  2. createDefaultPatch() incluye el módulo midi_in (el rack por defecto no es
 *     vacío — el MIDI del sistema tiene por dónde entrar).
 *  3. midi_in NO es un midiTarget (no se consume a sí mismo: reenvía, no recibe).
 */
#include <catch2/catch_test_macros.hpp>

#include "AceCatalog.h"
#include "RuntimeCompiler.h"
#include "PatchDocument.h"
#include "PatchIdentifiers.h"
#include "CompiledVoicePlan.h"
#include "ModPortTypes.h"

using namespace Omega::Core::Model;
using namespace Omega::Core::Ace;
using namespace Omega::Core::Modulation;

namespace {

    using Omega::Core::Compiler::RuntimeCompiler;

    ComponentInfo makeComponent(const std::string& id,
                                const std::vector<std::pair<ModPortType, bool>>& ports) {
        ComponentInfo info;
        info.id = id;
        info.name = id;
        info.modelId = id;
        info.family = "test";
        info.engine = "WASM";
        info.implementationId = 1;
        for (const auto& [type, isInput] : ports) {
            PortDescriptor p;
            p.id = "port" + std::to_string(info.ports.size());
            p.type = type;
            p.isInput = isInput;
            info.ports.push_back(p);
        }
        return info;
    }

    bool hasMidiTarget(const ::Omega::Core::Voice::CompiledVoicePlan& plan, const std::string& moduleId) {
        for (int i = 0; i < plan.midiTargetCount; ++i) {
            const uint8_t unitIdx = plan.midiTargets[i];
            if (unitIdx < (uint8_t)plan.unitCount && plan.units[unitIdx].moduleId == moduleId)
                return true;
        }
        return false;
    }

} // namespace

TEST_CASE("midiTargets: el módulo con puerto MIDI input se registra como target", "[midi][bridge][compiler]") {
    AceCatalog catalog;
    catalog.registerComponent(makeComponent("midi_in", {
        { ModPortType::MIDI, false },  // salida (reenvía)
        { ModPortType::Digital, true }, // telemetría
    }));
    catalog.registerComponent(makeComponent("omega_lab_monitor", {
        { ModPortType::Audio, true },
        { ModPortType::MIDI, true },   // input midi_events → CONSUMIDOR
    }));

    PatchDocument doc;
    ModuleInstance midiIn;
    midiIn.instanceId = 1;
    midiIn.typeId = ModuleTypeId::MidiIn;
    doc.modules.push_back(midiIn);

    // Consumidor: un módulo con puerto MIDI input (el catálogo lo resuelve por
    // mapTypeToId — usamos test_parity_v7 registrado como MIDI input).
    catalog.registerComponent(makeComponent("test_parity_v7", {
        { ModPortType::MIDI, true },
    }));
    ModuleInstance consumer;
    consumer.instanceId = 2;
    consumer.typeId = ModuleTypeId::TestParity;
    doc.modules.push_back(consumer);

    RuntimeSnapshot snap = RuntimeCompiler::compile(doc, catalog);

    REQUIRE(snap.voicePlan.unitCount == 2);
    REQUIRE(snap.voicePlan.midiTargetCount == 1);
    // El target es el módulo CONSUMIDOR (test_parity_v7 con MIDI input), no midi_in.
    REQUIRE(hasMidiTarget(snap.voicePlan, "test_parity_v7"));
    REQUIRE_FALSE(hasMidiTarget(snap.voicePlan, "midi_in"));
}

TEST_CASE("createDefaultPatch incluye midi_in como puente de entrada del rack", "[midi][bridge][default]") {
    PatchDocument doc = createDefaultPatch();

    REQUIRE(doc.modules.size() == 1);
    REQUIRE(doc.modules[0].typeId == ModuleTypeId::MidiIn);
    REQUIRE(doc.modules[0].instanceId == 1);
    // El módulo está en la posición base del rack
    REQUIRE(doc.modules[0].position.rack == 0);
    REQUIRE(doc.modules[0].position.slot == 0);
}

TEST_CASE("el compilador compila midi_in sin registrar targets espurios", "[midi][bridge][compiler]") {
    AceCatalog catalog;
    catalog.registerComponent(makeComponent("midi_in", {
        { ModPortType::MIDI, false }, // solo salida → NO es target
    }));

    PatchDocument doc = createDefaultPatch();
    RuntimeSnapshot snap = RuntimeCompiler::compile(doc, catalog);

    REQUIRE(snap.voicePlan.unitCount == 1);
    REQUIRE(snap.voicePlan.units[0].moduleId == "midi_in");
    REQUIRE(snap.voicePlan.midiTargetCount == 0);
}
