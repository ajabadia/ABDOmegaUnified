/**
 * [P0-3] Persistencia de patches a disco — integración RPC.
 *
 * Verifica el flujo completo contra un directorio temporal: savePreset escribe
 * el patch actual a disco, loadPreset lo restaura (con undo snapshot), listPresets
 * y getBrowserData leen la librería real, saveCurrentPatch persiste el autosave
 * de sesión (recuperable por una instancia nueva = reinicio), y un target
 * desconocido (patch de fábrica) cae al patch inicial.
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>

#include "AceCatalog.h"
#include "VirtualAnalogEngine.h"
#include "SystemSettingsManager.h"
#include "EngineConfigManager.h"
#include "PatchDocument.h"
#include "PatchIdentifiers.h"
#include "RpcPresetController.h"
#include "RpcHistoryController.h"
#include "PatchRepository.h"

using namespace Omega::Core::Model;
using namespace Omega::UI;
using namespace Omega::UI::Persistence;

namespace {

    /** RAII: directorio temporal único por test. */
    struct TempDir {
        juce::File dir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                             .getChildFile("omega_preset_p0_3_" + juce::Uuid().toString().substring(0, 12));

        TempDir() { dir.createDirectory(); }
        ~TempDir() { dir.deleteRecursively(); }
    };

    /** Harness idéntico a EngineConfigSemanticRouting + controllers RPC. */
    struct Harness {
        Omega::Core::Ace::AceCatalog catalog;
        Omega::Core::Service::SystemSettingsManager settings;
        ::Omega::Engine::Modular::VirtualAnalogEngine engine;
        Omega::Core::Service::EngineConfigManager config;
        PatchHistoryState history;
        RpcPresetController presets;

        explicit Harness(const juce::File& repoDir)
            : engine(settings), config(engine, catalog),
              history(config), presets(catalog, history, repoDir) {}
    };

    juce::var objWith(const char* key, const juce::String& value) {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty(key, value);
        return juce::var(obj.get());
    }

    PatchDocument makePatchWithOsc() {
        PatchDocument doc;
        doc.metadata.name = "Source Name";
        ModuleInstance mod;
        mod.instanceId = 7;
        mod.typeId = ModuleTypeId::VaOscillator;
        mod.position.rack = 1;
        mod.position.slot = 3;
        mod.parameters = { { ParamId::Frequency, 0.42f, 0 } };
        doc.modules.push_back(mod);
        return doc;
    }

} // namespace

TEST_CASE("savePreset escribe a disco y loadPreset restaura el patch", "[presets][p0-3]") {
    TempDir tmp;
    Harness h(tmp.dir);

    h.config.applyPatch(makePatchWithOsc());

    // --- savePreset { name } → SAVE_ACK + archivo en disco ---
    auto saveResp = h.presets.handleSavePreset("r1", objWith("name", "MY SAVED PATCH"));
    REQUIRE(saveResp["payload"].isBool());
    REQUIRE(saveResp["payload"] == juce::var(true));
    REQUIRE(h.presets.repository().exists("MY SAVED PATCH"));

    // --- Vaciar el rack (como un 'newPreset') ---
    h.config.applyPatch(createDefaultPatch());
    REQUIRE(h.config.getPatchDocument().modules.size() == 1);
    REQUIRE(h.config.getPatchDocument().modules[0].typeId == ModuleTypeId::MidiIn);

    // --- loadPreset { target } → restaura el documento guardado ---
    bool onLoadCalled = false;
    auto loadResp = h.presets.handleLoadPreset("r2", objWith("target", "MY SAVED PATCH"),
                                               [&]() { onLoadCalled = true; });
    REQUIRE(loadResp["payload"].isBool());
    REQUIRE(loadResp["payload"] == juce::var(true));
    REQUIRE(onLoadCalled);

    const auto& restored = h.config.getPatchDocument();
    REQUIRE(restored.modules.size() == 1);
    REQUIRE(restored.modules[0].instanceId == 7);
    REQUIRE(restored.modules[0].typeId == ModuleTypeId::VaOscillator);
    REQUIRE(restored.modules[0].position.slot == 3);
    REQUIRE(restored.modules[0].parameters.size() == 1);
    REQUIRE(restored.modules[0].parameters[0].value == Catch::Approx(0.42f));

    // El save sobrescribe la metadata con el nombre elegido.
    REQUIRE(restored.metadata.name == "MY SAVED PATCH");
}

TEST_CASE("listPresets y getBrowserData leen la librería real desde disco", "[presets][p0-3]") {
    TempDir tmp;
    Harness h(tmp.dir);

    h.config.applyPatch(makePatchWithOsc());
    REQUIRE(h.presets.handleSavePreset("r1", objWith("name", "ALPHA PATCH"))["payload"] == juce::var(true));
    REQUIRE(h.presets.handleSavePreset("r2", objWith("name", "BETA PATCH"))["payload"] == juce::var(true));

    // listPresets → nombres desde disco (antes: literal hardcodeado).
    auto listResp = h.presets.handleListPresets("r3", juce::var());
    const auto& names = *listResp["payload"].getArray();
    REQUIRE(names.size() == 2);
    REQUIRE(names[0].toString() == "ALPHA PATCH");
    REQUIRE(names[1].toString() == "BETA PATCH");

    // getBrowserData → Factory + User(disco).
    auto browserResp = h.presets.handleGetBrowserData("r4", juce::var());
    auto* root = browserResp["payload"].getDynamicObject();
    REQUIRE(root != nullptr);

    const auto& libs = *root->getProperty("libraries").getArray();
    REQUIRE(libs.size() == 2);

    auto* factory = libs[0].getDynamicObject();
    REQUIRE(factory->getProperty("name").toString() == "FACTORY");
    const auto& factoryPatches = *factory->getProperty("patches").getArray();
    // [P2-4] La librería de fábrica es real y programática (2 presets).
    REQUIRE(factoryPatches.size() == 2);
    REQUIRE(factoryPatches[0].getDynamicObject()->getProperty("name").toString() == "Aseptic Init Patch");
    REQUIRE(factoryPatches[1].getDynamicObject()->getProperty("name").toString() == "MIDI Monitor");

    auto* user = libs[1].getDynamicObject();
    REQUIRE(user->getProperty("name").toString() == "USER PRESETS");
    const auto& userPatches = *user->getProperty("patches").getArray();
    REQUIRE(userPatches.size() == 2);
    REQUIRE(userPatches[0].getDynamicObject()->getProperty("name").toString() == "ALPHA PATCH");
}

TEST_CASE("saveCurrentPatch persiste la sesión y una instancia nueva la restaura", "[presets][p0-3]") {
    TempDir tmp;
    {
        Harness h(tmp.dir);
        h.config.applyPatch(makePatchWithOsc());
        REQUIRE(h.presets.handleSaveCurrentPatch("r1", juce::var())["payload"] == juce::var(true));
    }

    // "Reinicio": repositorio nuevo sobre el mismo directorio.
    PatchRepository reopened(tmp.dir);
    PatchDocument session;
    REQUIRE(reopened.loadCurrent(session));
    REQUIRE(session.modules.size() == 1);
    REQUIRE(session.modules[0].instanceId == 7);

    // El autosave NO aparece en la lista de presets de usuario.
    REQUIRE(reopened.list().empty());
}

TEST_CASE("loadPreset carga los patches de fábrica reales por nombre (P2-4)", "[presets][p2-4]") {
    TempDir tmp;
    Harness h(tmp.dir);
    h.config.applyPatch(makePatchWithOsc());

    // Nombre de fábrica → se aplica el documento REAL (antes: INIT silencioso).
    auto resp = h.presets.handleLoadPreset("r1", objWith("target", "MIDI Monitor"), {});
    REQUIRE(resp["payload"].isBool());
    REQUIRE(resp["payload"] == juce::var(true));

    const auto& doc = h.config.getPatchDocument();
    REQUIRE(doc.modules.size() == 2);
    REQUIRE(doc.modules[0].typeId == ModuleTypeId::MidiIn);
    REQUIRE(doc.modules[1].typeId == ModuleTypeId::TestParity); // omega_lab_monitor
    REQUIRE(doc.metadata.name == "MIDI Monitor");

    // Un usuario que guardó un patch con el MISMO nombre: su copia manda.
    h.config.applyPatch(makePatchWithOsc());
    REQUIRE(h.presets.handleSavePreset("r2", objWith("name", "MIDI Monitor"))["payload"] == juce::var(true));
    auto respUser = h.presets.handleLoadPreset("r3", objWith("target", "MIDI Monitor"), {});
    REQUIRE(respUser["payload"] == juce::var(true));
    REQUIRE(h.config.getPatchDocument().modules.size() == 1);
    REQUIRE(h.config.getPatchDocument().modules[0].typeId == ModuleTypeId::VaOscillator);
}

TEST_CASE("deletePreset elimina el archivo y devuelve error para desconocidos (P2-4)", "[presets][p2-4]") {
    TempDir tmp;
    Harness h(tmp.dir);
    h.config.applyPatch(makePatchWithOsc());

    REQUIRE(h.presets.handleSavePreset("r1", objWith("name", "ALPHA PATCH"))["payload"] == juce::var(true));
    REQUIRE(h.presets.handleSavePreset("r2", objWith("name", "BETA PATCH"))["payload"] == juce::var(true));

    // Borrar uno existente → archivo eliminado, el otro intacto.
    auto delResp = h.presets.handleDeletePreset("r3", objWith("target", "ALPHA PATCH"));
    REQUIRE(delResp["payload"] == juce::var(true));
    REQUIRE(!h.presets.repository().exists("ALPHA PATCH"));
    REQUIRE(h.presets.repository().exists("BETA PATCH"));

    // La lista refleja el borrado.
    auto listResp = h.presets.handleListPresets("r4", juce::var());
    REQUIRE(listResp["payload"].getArray()->size() == 1);

    // Desconocido → error RPC (convenio: type = DELETE_FAILED + campo error).
    auto errResp = h.presets.handleDeletePreset("r5", objWith("target", "NOPE"));
    REQUIRE(errResp["type"].toString() == "DELETE_FAILED");
    REQUIRE(errResp["error"].toString().isNotEmpty());

    // Target vacío → error RPC.
    auto emptyResp = h.presets.handleDeletePreset("r6", objWith("target", ""));
    REQUIRE(emptyResp["type"].toString() == "DELETE_FAILED");
}

TEST_CASE("target desconocido (patch de fábrica) cae al patch inicial", "[presets][p0-3]") {
    TempDir tmp;
    Harness h(tmp.dir);
    h.config.applyPatch(makePatchWithOsc());

    auto resp = h.presets.handleLoadPreset("r1", objWith("target", "NON EXISTENT PATCH"), {});
    REQUIRE(resp["payload"].isBool());
    REQUIRE(resp["payload"] == juce::var(true));

    const auto& doc = h.config.getPatchDocument();
    REQUIRE(doc.modules.size() == 1);
    REQUIRE(doc.modules[0].typeId == ModuleTypeId::MidiIn);
}
