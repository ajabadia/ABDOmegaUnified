/**
 * Catch2 INTEGRATION test: la ruta completa del getState inicial en C++.
 *
 * Objetivo (serie globalFxParams #722): verificar que
 *   RpcParameterController::handleGetState(requestId, payload)
 * emite el MISMO patch shape que onStateUpdate — vía
 *   VarSerialization::buildPatchWireVar(config.getPatchDocument())
 * — incluyendo `globalFxParams` (keyed por id-string) y `patchbayMatrix`
 * (source/target/amount/via/viaAmount/color/active) en el PRIMER state.
 *
 * Para evitar arrastrar el plugin completo (OmegaUiBridge, editor WebView),
 * se usa un stub minimal de `OmegaAudioProcessor` (patrón TestProcessor de
 * ParameterLayoutBuilder.test.cpp) que expone únicamente
 * `getEngineConfigManager()`. El controller se compila desde su TU real.
 *
 * Dependencias de link: omega_core (EngineConfigManager/RuntimeCompiler),
 * omega_engine (VirtualAnalogEngine), juce_audio_processors/utils/gui.
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>

// ---- Stub de OmegaAudioProcessor (debe definirse ANTES del include del TU) ----
#include <juce_audio_processors/juce_audio_processors.h>
#include "VirtualAnalogEngine.h"
#include "AceCatalog.h"
#include "SystemSettingsManager.h"
#include "EngineConfigManager.h"
#include "PatchDocument.h"
#include "PatchIdentifiers.h"

namespace Omega::Plugin {

/** Stub: solo lo que handleGetState consume (getEngineConfigManager). */
class OmegaAudioProcessor {
public:
    OmegaAudioProcessor()
        : mSystemSettings(), mEngine(mSystemSettings), mEngineConfig(mEngine, mCatalog) {}

    Core::Service::EngineConfigManager& getEngineConfigManager() noexcept { return mEngineConfig; }

private:
    Core::Ace::AceCatalog mCatalog;
    Core::Service::SystemSettingsManager mSystemSettings;
    ::Omega::Engine::Modular::VirtualAnalogEngine mEngine;
    Core::Service::EngineConfigManager mEngineConfig;
};

} // namespace Omega::Plugin

// TU real del controller (compila con el stub ya definido; el include de
// OmegaAudioProcessor.h queda cubierto por el pragma once + definición previa).
#include "../UI/Controllers/Runtime/RpcParameterController.cpp"

using namespace Omega::UI;
using namespace Omega::Core::Model;

namespace {

/** APVTS anfitrión mínimo (idéntico patrón a ParameterLayoutBuilder.test.cpp). */
class TestProcessor final : public juce::AudioProcessor {
public:
    TestProcessor()
        : juce::AudioProcessor (juce::AudioProcessor::BusesProperties()
                                    .withOutput ("Output", juce::AudioChannelSet::stereo(), true)) {}

    const juce::String getName() const override { return "TestProcessor"; }
    void prepareToPlay(double, int) override {}
    void releaseResources() override {}
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) override { buffer.clear(); }
    void processBlock(juce::AudioBuffer<double>& buffer, juce::MidiBuffer&) override { buffer.clear(); }
    juce::AudioProcessorEditor* createEditor() override { return nullptr; }
    bool hasEditor() const override { return false; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}
    void getStateInformation(juce::MemoryBlock&) override {}
    void setStateInformation(const void*, int) override {}
};

/** Construye un PatchDocument con FX globales + patchbay matrix + un módulo. */
PatchDocument makeSeededDocument() {
    PatchDocument doc;
    doc.metadata.name = "GetState Patch";
    doc.metadata.author = "IntegrationTest";
    doc.masterGainDb = -3.5f;

    ModuleInstance mod;
    mod.instanceId = 7;
    mod.typeId = ModuleTypeId::VaOscillator;
    mod.position.rack = 1;
    mod.position.slot = 3;
    mod.parameters.push_back({ ParamId::Frequency, 0.5f, 0 });
    doc.modules.push_back(mod);

    doc.globalFxParams.push_back({ ParamId::Mix, 0.6f, 0 });
    doc.globalFxParams.push_back({ ParamId::Feedback, 0.25f, 0 });

    PatchbayMatrixSlot slot;
    slot.source = "osc1.freq";
    slot.target = "flt.cutoff";
    slot.amount = 0.25f;
    slot.via = "lfo1.rate";
    slot.viaAmount = 0.5f;
    slot.color = "#ff8800";
    slot.active = true;
    doc.patchbayMatrix.push_back(slot);

    return doc;
}

} // namespace

TEST_CASE("handleGetState emite globalFxParams y patchbayMatrix en el primer state", "[integration][getstate][wireformat]") {
    Omega::Plugin::OmegaAudioProcessor processor;
    auto& config = processor.getEngineConfigManager();
    config.applyPatch(makeSeededDocument());

    TestProcessor apvtsHost;
    juce::AudioProcessorValueTreeState apvts (apvtsHost, nullptr, "PARAMETERS",
                                              juce::AudioProcessorValueTreeState::ParameterLayout{});
    RpcParameterController controller (&processor, apvts);

    // --- Simular la llamada del bridge: getState ---
    const juce::var response = controller.handleGetState (juce::var (1001), juce::var());

    // Envelope del RPC response
    auto* respObj = response.getDynamicObject();
    REQUIRE(respObj != nullptr);
    REQUIRE(respObj->getProperty("type").toString() == "state");
    REQUIRE((int)respObj->getProperty("requestId") == 1001);

    // Payload: schemaVersion Era 7 + patch
    auto* payload = respObj->getProperty("payload").getDynamicObject();
    REQUIRE(payload != nullptr);
    REQUIRE(payload->getProperty("schemaVersion").toString() == "7.0");

    auto* patch = payload->getProperty("patch").getDynamicObject();
    REQUIRE(patch != nullptr);

    // Metadata + global
    REQUIRE(patch->getProperty("name").toString() == "GetState Patch");
    REQUIRE(patch->getProperty("author").toString() == "IntegrationTest");
    REQUIRE((double)patch->getProperty("masterGainDb") == Catch::Approx(-3.5));

    // Modules: keyed params (wire format), componentId/rack/slot
    auto* modsArr = patch->getProperty("modules").getArray();
    REQUIRE(modsArr != nullptr);
    REQUIRE(modsArr->size() == 1);
    auto* mo = (*modsArr)[0].getDynamicObject();
    REQUIRE((int)mo->getProperty("instanceId") == 7);
    REQUIRE(mo->getProperty("componentId").toString() == "osc_va_basic");
    REQUIRE(mo->getProperty("rack").toString() == "upper");
    REQUIRE((int)mo->getProperty("slot") == 3);
    auto* params = mo->getProperty("parameters").getDynamicObject();
    REQUIRE((double)params->getProperty("1") == Catch::Approx(0.5)); // ParamId::Frequency

    // globalFxParams: keyed por id-string (Mix=200, Feedback=201)
    auto* fx = patch->getProperty("globalFxParams").getDynamicObject();
    REQUIRE(fx != nullptr);
    REQUIRE((double)fx->getProperty("200") == Catch::Approx(0.6));
    REQUIRE((double)fx->getProperty("201") == Catch::Approx(0.25));

    // patchbayMatrix: los 7 campos
    auto* matrixArr = patch->getProperty("patchbayMatrix").getArray();
    REQUIRE(matrixArr != nullptr);
    REQUIRE(matrixArr->size() == 1);
    auto* so = (*matrixArr)[0].getDynamicObject();
    REQUIRE(so->getProperty("source").toString() == "osc1.freq");
    REQUIRE(so->getProperty("target").toString() == "flt.cutoff");
    REQUIRE((double)so->getProperty("amount") == Catch::Approx(0.25));
    REQUIRE(so->getProperty("via").toString() == "lfo1.rate");
    REQUIRE((double)so->getProperty("viaAmount") == Catch::Approx(0.5));
    REQUIRE(so->getProperty("color").toString() == "#ff8800");
    REQUIRE((bool)so->getProperty("active") == true);
}

TEST_CASE("handleGetState con patch vacío emite shape completo sin crashear", "[integration][getstate][wireformat]") {
    Omega::Plugin::OmegaAudioProcessor processor;
    processor.getEngineConfigManager().applyPatch (PatchDocument {});

    TestProcessor apvtsHost;
    juce::AudioProcessorValueTreeState apvts (apvtsHost, nullptr, "PARAMETERS",
                                              juce::AudioProcessorValueTreeState::ParameterLayout{});
    RpcParameterController controller (&processor, apvts);

    const juce::var response = controller.handleGetState (juce::var (1002), juce::var());
    auto* payload = response.getDynamicObject()->getProperty("payload").getDynamicObject();
    REQUIRE(payload->getProperty("schemaVersion").toString() == "7.0");

    auto* patch = payload->getProperty("patch").getDynamicObject();
    REQUIRE(patch->getProperty("modules").getArray()->size() == 0);
    REQUIRE(patch->getProperty("globalFxParams").getDynamicObject() != nullptr);
    REQUIRE(patch->getProperty("globalFxParams").getDynamicObject()->getProperties().size() == 0);
    REQUIRE(patch->getProperty("patchbayMatrix").getArray()->size() == 0);
}
