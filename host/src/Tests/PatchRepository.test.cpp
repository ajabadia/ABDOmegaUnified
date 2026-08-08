/**
 * [P0-3] PatchRepository — persistencia de patches a disco.
 *
 * Verifica el round-trip COMPLETO del PatchDocument (metadata, módulos con
 * flags/params, conexiones, globalFxParams y patchbayMatrix 7/7 — campos que el
 * serializador binario del plugin omite), el autosave de sesión (current), la
 * lista de presets y la sanitización de nombres. Todo contra un directorio
 * temporal aislado.
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>

#include "PatchRepository.h"
#include "VarSerialization.h"
#include "PatchIdentifiers.h"

using namespace Omega::Core::Model;
using namespace Omega::UI::Persistence;

namespace {

    /** RAII: directorio temporal único por test. */
    struct TempDir {
        juce::File dir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                             .getChildFile("omega_patch_repo_" + juce::Uuid().toString().substring(0, 12));

        TempDir() { dir.createDirectory(); }
        ~TempDir() { dir.deleteRecursively(); }
    };

    /** Documento con TODOS los campos que deben sobrevivir al round-trip. */
    PatchDocument makeRichDocument() {
        PatchDocument doc;
        doc.metadata.uuid = "11111111-2222-3333-4444-555555555555";
        doc.metadata.name = "Original Name";
        doc.metadata.author = "Test Author";
        doc.metadata.createdAt = 123456789;
        doc.metadata.modifiedAt = 987654321;
        doc.metadata.tags = { "test", "p0-3" };
        doc.masterGainDb = -3.5f;
        doc.globalTranspose = 2;
        doc.globalMidiChannel = 1;

        ModuleInstance modA;
        modA.instanceId = 1;
        modA.typeId = ModuleTypeId::MidiIn;
        modA.position.rack = 0;
        modA.position.slot = 2;
        modA.position.order = 1;
        modA.flags.bypassed = false;
        modA.flags.muted = true;
        modA.flags.soloed = false;
        modA.parameters = { { ParamId::Mix, 0.75f, 0 }, { ParamId::Feedback, 0.25f, 7 } };
        doc.modules.push_back(modA);

        ModuleInstance modB;
        modB.instanceId = 2;
        modB.typeId = ModuleTypeId::JunoFilter;
        modB.position.rack = 1;
        modB.position.slot = 0;
        modB.position.order = 0;
        modB.flags.bypassed = true;
        doc.modules.push_back(modB);

        doc.connections.push_back({ 1, 0, 2, 1, ConnectionType::CV });
        doc.globalFxParams = { { ParamId::Mix, 0.5f, 0 }, { ParamId::Intensity, 0.9f, 3 } };
        doc.patchbayMatrix = {
            { "1.midi_out", "2.cutoff", 0.8f, "1.led", 0.2f, true, "#00f0ff" },
            { "2.out", "1.in", 0.5f, "", 0.0f, false, "" }
        };
        return doc;
    }

} // namespace

TEST_CASE("round-trip completo a disco: módulos, conexiones, fx y patchbayMatrix", "[persistence][p0-3]") {
    TempDir tmp;
    PatchRepository repo(tmp.dir);
    const auto doc = makeRichDocument();

    REQUIRE(repo.save(doc, "RICH PATCH"));

    PatchDocument restored;
    REQUIRE(repo.load("RICH PATCH", restored));

    // Metadata
    REQUIRE(restored.metadata.name == "RICH PATCH"); // save() actualiza el nombre
    REQUIRE(restored.metadata.author == "Test Author");
    REQUIRE(restored.metadata.uuid == "11111111-2222-3333-4444-555555555555");
    REQUIRE(restored.metadata.createdAt == 123456789);
    REQUIRE(restored.metadata.modifiedAt >= 987654321); // save() refresca modifiedAt
    REQUIRE(restored.metadata.tags.size() == 2);
    REQUIRE(restored.metadata.tags[0] == "test");

    // Globales
    REQUIRE(restored.masterGainDb == Catch::Approx(-3.5f));
    REQUIRE(restored.globalTranspose == 2);
    REQUIRE(restored.globalMidiChannel == 1);

    // Módulos
    REQUIRE(restored.modules.size() == 2);
    const auto& modA = restored.modules[0];
    REQUIRE(modA.instanceId == 1);
    REQUIRE(modA.typeId == ModuleTypeId::MidiIn);
    REQUIRE(modA.position.slot == 2);
    REQUIRE(modA.flags.muted);
    REQUIRE(!modA.flags.bypassed);
    REQUIRE(modA.parameters.size() == 2);
    REQUIRE(modA.parameters[0].id == ParamId::Mix);
    REQUIRE(modA.parameters[0].value == Catch::Approx(0.75f));
    REQUIRE(modA.parameters[1].modulationBindingId == 7);
    const auto& modB = restored.modules[1];
    REQUIRE(modB.typeId == ModuleTypeId::JunoFilter);
    REQUIRE(modB.flags.bypassed);

    // Conexiones
    REQUIRE(restored.connections.size() == 1);
    REQUIRE(restored.connections[0].sourceModuleId == 1);
    REQUIRE(restored.connections[0].type == ConnectionType::CV);

    // FX globales
    REQUIRE(restored.globalFxParams.size() == 2);
    REQUIRE(restored.globalFxParams[1].id == ParamId::Intensity);
    REQUIRE(restored.globalFxParams[1].value == Catch::Approx(0.9f));

    // Patchbay Matrix (7/7 campos, incl. color — el binario del plugin lo omite)
    REQUIRE(restored.patchbayMatrix.size() == 2);
    const auto& slot = restored.patchbayMatrix[0];
    REQUIRE(slot.source == "1.midi_out");
    REQUIRE(slot.target == "2.cutoff");
    REQUIRE(slot.amount == Catch::Approx(0.8f));
    REQUIRE(slot.via == "1.led");
    REQUIRE(slot.viaAmount == Catch::Approx(0.2f));
    REQUIRE(slot.active);
    REQUIRE(slot.color == "#00f0ff");
    const auto& slot2 = restored.patchbayMatrix[1];
    REQUIRE(slot2.via.empty());
    REQUIRE(!slot2.active);
}

TEST_CASE("los patches sobreviven a una reapertura del repositorio (reinicio)", "[persistence][p0-3]") {
    TempDir tmp;
    {
        PatchRepository repo(tmp.dir);
        REQUIRE(repo.save(makeRichDocument(), "SESSION PATCH"));
    }

    // Nueva instancia sobre el mismo directorio = reinicio del host.
    PatchRepository reopened(tmp.dir);
    PatchDocument restored;
    REQUIRE(reopened.load("SESSION PATCH", restored));
    REQUIRE(restored.modules.size() == 2);
    REQUIRE(restored.patchbayMatrix.size() == 2);
}

TEST_CASE("list() devuelve los presets de usuario y excluye el autosave", "[persistence][p0-3]") {
    TempDir tmp;
    PatchRepository repo(tmp.dir);

    REQUIRE(repo.save(makeRichDocument(), "PATCH ONE"));
    REQUIRE(repo.save(makeRichDocument(), "PATCH TWO"));
    REQUIRE(repo.saveCurrent(makeRichDocument()));

    auto entries = repo.list();
    REQUIRE(entries.size() == 2);

    // Orden alfabético (sort de juce::Array<File>).
    REQUIRE(entries[0].name == "PATCH ONE");
    REQUIRE(entries[1].name == "PATCH TWO");
    REQUIRE(entries[0].author == "Test Author");
    REQUIRE(entries[0].modifiedAt > 0);

    // El autosave existe a disco pero NO se lista como preset de usuario.
    REQUIRE(repo.currentFile().existsAsFile());
    REQUIRE(repo.exists("PATCH ONE"));
    REQUIRE(!repo.exists("PATCH THREE"));
}

TEST_CASE("autosave de sesión: saveCurrent/loadCurrent con sobrescritura", "[persistence][p0-3]") {
    TempDir tmp;
    PatchRepository repo(tmp.dir);

    auto first = makeRichDocument();
    first.masterGainDb = 1.0f;
    REQUIRE(repo.saveCurrent(first));

    PatchDocument restored;
    REQUIRE(repo.loadCurrent(restored));
    REQUIRE(restored.masterGainDb == Catch::Approx(1.0f));
    REQUIRE(restored.modules.size() == 2);

    // Sobrescritura idempotente.
    auto second = makeRichDocument();
    second.masterGainDb = -12.0f;
    REQUIRE(repo.saveCurrent(second));
    REQUIRE(repo.loadCurrent(restored));
    REQUIRE(restored.masterGainDb == Catch::Approx(-12.0f));

    // Sin autosave previo (directorio inexistente) → false.
    const juce::File missingDir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                                      .getChildFile("omega_no_such_dir_xyz");
    PatchRepository emptyRepo(missingDir);
    PatchDocument nada;
    REQUIRE_FALSE(emptyRepo.loadCurrent(nada));
    REQUIRE(emptyRepo.list().empty());
}

TEST_CASE("sanitización de nombres y remove", "[persistence][p0-3]") {
    TempDir tmp;
    PatchRepository repo(tmp.dir);

    // Caracteres no válidos en nombres de archivo Windows → '_'.
    REQUIRE(repo.save(makeRichDocument(), "My: Patch/1"));
    PatchDocument restored;
    REQUIRE(repo.load("My: Patch/1", restored));
    REQUIRE(restored.metadata.name == "My_ Patch_1");

    REQUIRE(repo.remove("My: Patch/1"));
    REQUIRE_FALSE(repo.exists("My: Patch/1"));
    REQUIRE(repo.list().empty());

    // load de un nombre inexistente → false.
    REQUIRE_FALSE(repo.load("NO EXISTE", restored));
}
