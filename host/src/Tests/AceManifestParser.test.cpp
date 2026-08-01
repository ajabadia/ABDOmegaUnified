/**
 * Catch2 tests for pure functions of AceManifestParser
 * (safeAsFloat / safeAsInt and the parse logic).
 *
 * Fase 5.2: helpers live in YamlHelpers, JSON parsing in AceContractJsonParser,
 * and the telemetry side-effect moved to AcePackLoader::registerPortTelemetry.
 *
 * Dependencies: yaml-cpp + omega_core (AceTypes, ModulationTelemetryRegistry).
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include <yaml-cpp/yaml.h>
#include "AceManifestParser.h"
#include "YAMLHelpers.h"
#include "AceContractJsonParser.h"
#include "AcePackLoader.h"
#include "AceTypes.h"

using namespace Omega::Core::Ace;

// ---------------------------------------------------------------------------
// safeAsFloat
// ---------------------------------------------------------------------------

TEST_CASE("safeAsFloat returns the parsed float for a valid scalar", "[parser][safeAsFloat]") {
    auto node = YAML::Load("value: 3.5");
    REQUIRE(YamlHelpers::safeAsFloat(node["value"], 0.0f) == Catch::Approx(3.5f));
}

TEST_CASE("safeAsFloat returns fallback for a null node", "[parser][safeAsFloat]") {
    auto node = YAML::Load("value:");
    REQUIRE(YamlHelpers::safeAsFloat(node["value"], -1.0f) == Catch::Approx(-1.0f));
}

TEST_CASE("safeAsFloat returns fallback for an undefined node", "[parser][safeAsFloat]") {
    auto node = YAML::Load("other: 1");
    REQUIRE(YamlHelpers::safeAsFloat(node["missing"], 2.5f) == Catch::Approx(2.5f));
}

TEST_CASE("safeAsFloat returns fallback for a non-numeric scalar", "[parser][safeAsFloat]") {
    auto node = YAML::Load("value: not-a-number");
    REQUIRE(YamlHelpers::safeAsFloat(node["value"], 42.0f) == Catch::Approx(42.0f));
}

TEST_CASE("safeAsFloat returns fallback for a sequence node", "[parser][safeAsFloat]") {
    auto node = YAML::Load("value: [1, 2, 3]");
    REQUIRE(YamlHelpers::safeAsFloat(node["value"], 7.0f) == Catch::Approx(7.0f));
}

// ---------------------------------------------------------------------------
// safeAsInt
// ---------------------------------------------------------------------------

TEST_CASE("safeAsInt returns the parsed int for a valid scalar", "[parser][safeAsInt]") {
    auto node = YAML::Load("value: 12");
    REQUIRE(YamlHelpers::safeAsInt(node["value"], 0) == 12);
}

TEST_CASE("safeAsInt returns fallback for a null node", "[parser][safeAsInt]") {
    auto node = YAML::Load("value:");
    REQUIRE(YamlHelpers::safeAsInt(node["value"], 99) == 99);
}

TEST_CASE("safeAsInt returns fallback for an undefined node", "[parser][safeAsInt]") {
    auto node = YAML::Load("other: 1");
    REQUIRE(YamlHelpers::safeAsInt(node["missing"], 5) == 5);
}

// yaml-cpp 0.8.0 rejects trailing characters (".7" after the int), so
// "3.7" cannot be decoded as int -> fallback is returned.
TEST_CASE("safeAsInt returns fallback for a float scalar", "[parser][safeAsInt]") {
    auto node = YAML::Load("value: 3.7");
    REQUIRE(YamlHelpers::safeAsInt(node["value"], 8) == 8);
}

TEST_CASE("safeAsInt returns fallback for a non-numeric scalar", "[parser][safeAsInt]") {
    auto node = YAML::Load("value: abc");
    REQUIRE(YamlHelpers::safeAsInt(node["value"], -3) == -3);
}

// ---------------------------------------------------------------------------
// parseComponentNode (full Era 7 manifest)
// ---------------------------------------------------------------------------

TEST_CASE("parseComponentNode extracts metadata, engine and UI block", "[parser][component]") {
    auto doc = YAML::Load(R"yaml(
id: osc_va_basic
version: 7
metadata:
  name: VA Basic Osc
  family: oscillator
  description: Aseptic VA oscillator
  rack:
    hp: 12
    slot: upper
  tags: [osc, va]
  governance:
    registry_role: osc.core
    vendor_id: ABD
engine: Modular
ui:
  skin: industrial
  dimensions:
    width: 60
    height: 420
  lighting:
    shadowAngle: 90
    distance: 5
    blur: 2
    shadowColor: "rgba(0,0,0,0.5)"
  colors:
    accent: "#00ff9d"
  typography:
    label: "10px"
  layout:
    gridSnap: 5
    containers:
      - id: main
        label: Main
        pos: { x: 0, y: 0 }
        size: { w: full, h: 420 }
        variant: default
        zIndex: 1
        labelPosition: top
  controls:
    - bind: freq
      type: knob
      label: Frequency
      default: 0.5
      pos: { x: 10, y: 20 }
      range: { min: 0, max: 1, default: 0.5 }
      presentation:
        tab: MAIN
        container: main
        component: knob
        attachments:
          - type: label
            position: top
            text: FREQ
  jacks:
    - bind: out
      type: port
      signal: audio
      direction: output
      label: OUT
)yaml");

    ComponentInfo info;
    AceManifestParser::parseComponentNode(doc, info);

    // Identity & metadata
    REQUIRE(info.id == "osc_va_basic");
    REQUIRE(info.version == 7);
    REQUIRE(info.modelId == "osc_va_basic");
    REQUIRE(info.name == "VA Basic Osc");
    REQUIRE(info.family == "oscillator");
    REQUIRE(info.description == "Aseptic VA oscillator");
    REQUIRE(info.hp == 12);
    REQUIRE(info.rack == "upper");
    REQUIRE(info.tags.size() == 2);
    REQUIRE(info.registryRole == "osc.core");
    REQUIRE(info.vendorId == "ABD");
    REQUIRE(info.engine == "Modular");

    // UI block
    REQUIRE(info.uiSkin == "industrial");
    REQUIRE(info.uiWidth == Catch::Approx(60.0f));
    REQUIRE(info.uiHeight == Catch::Approx(420.0f));
    REQUIRE(info.lighting.shadowAngle == Catch::Approx(90.0f));
    REQUIRE(info.lighting.distance == Catch::Approx(5.0f));
    REQUIRE(info.lighting.blur == Catch::Approx(2.0f));
    REQUIRE(info.lighting.shadowColor == "rgba(0,0,0,0.5)");
    REQUIRE(info.uiColors.at("accent") == "#00ff9d");
    REQUIRE(info.uiTypography.at("label") == "10px");

    // Layout containers
    REQUIRE(info.gridSnap == 5);
    REQUIRE(info.uiContainers.size() == 1);
    REQUIRE(info.uiContainers[0].id == "main");
    REQUIRE(info.uiContainers[0].width == "full");
    REQUIRE(info.uiContainers[0].height == Catch::Approx(420.0f));
    REQUIRE(info.uiContainers[0].zIndex == 1);

    // Controls -> parameters
    REQUIRE(info.uiControls.size() == 1);
    REQUIRE(info.uiControls[0].bind == "freq");
    REQUIRE(info.uiControls[0].type == "knob");
    REQUIRE(info.uiControls[0].x == Catch::Approx(10.0f));
    REQUIRE(info.uiControls[0].y == Catch::Approx(20.0f));
    REQUIRE(info.uiControls[0].tab == "MAIN");
    REQUIRE(info.uiControls[0].container == "main");
    REQUIRE(info.uiControls[0].attachments.size() == 1);
    REQUIRE(info.uiControls[0].attachments[0].type == "label");

    REQUIRE(info.parameters.size() == 1);
    REQUIRE(info.parameters[0].id == "freq");
    REQUIRE(info.parameters[0].defaultValue == Catch::Approx(0.5f));
    REQUIRE(info.parameters[0].min == Catch::Approx(0.0f));
    REQUIRE(info.parameters[0].max == Catch::Approx(1.0f));
    REQUIRE(info.defaultParams["freq"] == Catch::Approx(0.5f));

    // Jacks -> ports. NOTE: the "freq" knob control is also modulable
    // (isModulable == true for anything that is not display/led), so it
    // produces a CV input port in addition to the audio output port.
    REQUIRE(info.uiJacks.size() == 1);
    REQUIRE(info.uiJacks[0].bind == "out");
    REQUIRE(info.ports.size() == 2);
    REQUIRE(info.ports[0].id == "freq");
    REQUIRE(info.ports[0].isInput == true);
    REQUIRE(info.ports[0].type == Omega::Core::Modulation::ModPortType::CV);
    REQUIRE(info.ports[1].id == "out");
    REQUIRE(info.ports[1].isInput == false);
    REQUIRE(info.ports[1].type == Omega::Core::Modulation::ModPortType::Audio);
}

TEST_CASE("parseComponentNode defaults are applied for missing optional blocks", "[parser][component]") {
    auto doc = YAML::Load(R"yaml(
id: minimal_mod
metadata:
  name: Minimal
)yaml");

    ComponentInfo info;
    AceManifestParser::parseComponentNode(doc, info);

    REQUIRE(info.id == "minimal_mod");
    REQUIRE(info.version == 7);            // Era 7 default
    REQUIRE(info.modelId == "minimal_mod"); // legacy compatibility
    REQUIRE(info.family == "utility");      // default family
    REQUIRE(info.engine == "Modular");      // default engine
    // ui block absent -> uiSkin stays empty (never assigned "industrial")
    REQUIRE(info.uiSkin.empty());
    REQUIRE(info.uiWidth == Catch::Approx(0.0f));
    REQUIRE(info.parameters.empty());
    REQUIRE(info.ports.empty());
}

TEST_CASE("parseComponentNode returns early when metadata block is missing", "[parser][component]") {
    auto doc = YAML::Load(R"yaml(
id: broken_mod
ui:
  controls: []
)yaml");

    ComponentInfo info;
    AceManifestParser::parseComponentNode(doc, info);

    // Metadata is mandatory: name/family remain empty (early return)
    REQUIRE(info.id == "broken_mod");
    REQUIRE(info.version == 7);
    REQUIRE(info.name.empty());
    REQUIRE(info.family.empty());
}

TEST_CASE("parseComponentNode maps signal strings to port types", "[parser][component]") {
    auto doc = YAML::Load(R"yaml(
id: test_ports
metadata:
  name: Test Ports
ui:
  jacks:
    - bind: audio_in
      type: jack
      signal: audio
      direction: input
    - bind: cv_in
      type: jack
      signal: cv
      direction: input
    - bind: midi_in
      type: jack
      signal: midi
      direction: input
    - bind: gate_in
      type: jack
      signal: gate
      direction: input
    - bind: cv_out
      type: jack
      signal: cv
      direction: output
)yaml");

    ComponentInfo info;
    AceManifestParser::parseComponentNode(doc, info);

    REQUIRE(info.ports.size() == 5);
    REQUIRE(info.ports[0].type == Omega::Core::Modulation::ModPortType::Audio);
    REQUIRE(info.ports[1].type == Omega::Core::Modulation::ModPortType::CV);
    REQUIRE(info.ports[2].type == Omega::Core::Modulation::ModPortType::MIDI);
    REQUIRE(info.ports[3].type == Omega::Core::Modulation::ModPortType::Gate);
    REQUIRE(info.ports[4].type == Omega::Core::Modulation::ModPortType::CV);
    REQUIRE(info.ports[4].isInput == false); // direction: output

    // Fase 5.2: the parser is pure — telemetry indices are left at -1.
    // Registration is a loader side-effect (see registerPortTelemetry below).
    REQUIRE(info.ports[0].telemetryIndex == -1); // audio input, NOT registered by parser
    REQUIRE(info.ports[4].telemetryIndex == -1); // output, NOT registered by parser
}

// ---------------------------------------------------------------------------
// AcePackLoader::registerPortTelemetry (moved side-effect, Fase 5.2)
// ---------------------------------------------------------------------------

TEST_CASE("registerPortTelemetry registers audio inputs and outputs", "[loader][telemetry]") {
    ComponentInfo info;
    info.id = "tele_mod";

    Omega::Core::Modulation::PortDescriptor audioIn;
    audioIn.id = "audio_in";
    audioIn.label = "AUDIO IN";
    audioIn.type = Omega::Core::Modulation::ModPortType::Audio;
    audioIn.isInput = true;

    Omega::Core::Modulation::PortDescriptor cvIn;
    cvIn.id = "cv_in";
    cvIn.label = "CV IN";
    cvIn.type = Omega::Core::Modulation::ModPortType::CV;
    cvIn.isInput = true;

    Omega::Core::Modulation::PortDescriptor cvOut;
    cvOut.id = "cv_out";
    cvOut.label = "CV OUT";
    cvOut.type = Omega::Core::Modulation::ModPortType::CV;
    cvOut.isInput = false;

    info.ports = { audioIn, cvIn, cvOut };

    AcePackLoader::registerPortTelemetry(info);

    REQUIRE(info.ports[0].telemetryIndex >= 0); // audio input -> registered
    REQUIRE(info.ports[1].telemetryIndex == -1); // CV input -> NOT registered (not visualizable)
    REQUIRE(info.ports[2].telemetryIndex >= 0); // output -> registered
}

// ---------------------------------------------------------------------------
// parseContractJson (AceContractJsonParser)
// ---------------------------------------------------------------------------

TEST_CASE("parseContractJson parses a WASM contract into ComponentInfo", "[parser][contract]") {
    const std::string json = R"({
        "id": "osc_wasm",
        "name": "WASM Osc",
        "family": "oscillator",
        "parameters": [
            { "id": "freq", "label": "Frequency", "min": 0.0, "max": 1.0, "default": 0.3, "unit": "Hz" }
        ]
    })";

    ComponentInfo info;
    REQUIRE(AceContractJsonParser::parseContractJson(json, info) == true);

    REQUIRE(info.id == "osc_wasm");
    REQUIRE(info.name == "WASM Osc");
    REQUIRE(info.family == "oscillator");
    REQUIRE(info.engine == "WASM");

    REQUIRE(info.parameters.size() == 1);
    const auto& p = info.parameters[0];
    REQUIRE(p.id == "freq");
    REQUIRE(p.label == "Frequency");
    REQUIRE(p.min == Catch::Approx(0.0f));
    REQUIRE(p.max == Catch::Approx(1.0f));
    REQUIRE(p.defaultValue == Catch::Approx(0.3f));
    REQUIRE(p.unit == "Hz");
    REQUIRE(p.modulable == true);
    REQUIRE(p.front == true);
    REQUIRE(p.back == true);
    REQUIRE(info.defaultParams["freq"] == Catch::Approx(0.3f));

    // Each parameter generates a matching CV input port
    REQUIRE(info.ports.size() == 1);
    REQUIRE(info.ports[0].id == "freq");
    REQUIRE(info.ports[0].isInput == true);
    REQUIRE(info.ports[0].type == Omega::Core::Modulation::ModPortType::CV);
}

TEST_CASE("parseContractJson returns false for invalid JSON", "[parser][contract]") {
    ComponentInfo info;
    REQUIRE(AceContractJsonParser::parseContractJson("{not valid json", info) == false);
}

TEST_CASE("parseContractJson returns false for a JSON without id", "[parser][contract]") {
    ComponentInfo info;
    REQUIRE(AceContractJsonParser::parseContractJson(R"({"name": "NoId"})", info) == false);
}

TEST_CASE("parseContractJson with no parameters yields empty port list", "[parser][contract]") {
    ComponentInfo info;
    REQUIRE(AceContractJsonParser::parseContractJson(R"({"id": "no_params"})", info) == true);
    REQUIRE(info.parameters.empty());
    REQUIRE(info.ports.empty());
}
