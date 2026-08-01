/**
 * Catch2 tests for AceContractExporter builders
 * (exportComponentContract / generateSchema).
 *
 * Dependencies: omega_core (AceTypes, AceCatalog, AceValidator).
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "AceContractExporter.h"
#include "AceCatalog.h"
#include "AceTypes.h"
#include "ExportUI.h"
#include "ExportControls.h"
#include "ExportAttachments.h"

using namespace Omega::Core::Ace;
using namespace Omega::Core::Modulation;

namespace {

/** Builds a fully valid ComponentInfo (passes AceValidator). */
ComponentInfo makeValidComponent() {
    ComponentInfo info;
    info.id = "osc_va_basic";
    info.name = "VA Basic Osc";
    info.modelId = "osc_va_basic"; // identity validation requires it
    info.description = "Aseptic VA oscillator";
    info.family = "oscillator";
    info.engine = "Modular";
    info.version = 7;
    info.hp = 12;
    info.uiSkin = "industrial";
    info.uiWidth = 60.0f;
    info.uiHeight = 420.0f;
    info.manifestHash = "abc123";

    ParameterDef p;
    p.id = "freq";
    p.label = "Frequency";
    p.unit = "Hz";
    p.min = 0.0f;
    p.max = 1.0f;
    p.defaultValue = 0.5f;
    p.modulable = true;
    info.parameters.push_back(p);

    PortDescriptor port;
    port.id = "out";
    port.label = "Output";
    port.type = ModPortType::Audio;
    port.isInput = false;
    port.telemetryIndex = 0;
    port.defaultValue = 0.0f;
    info.ports.push_back(port);

    return info;
}

} // namespace

// ---------------------------------------------------------------------------
// generateSchema
// ---------------------------------------------------------------------------

TEST_CASE("generateSchema produces an OMEGA draft-07 schema", "[exporter][schema]") {
    auto schema = AceContractExporter::generateSchema();
    REQUIRE(schema["$schema"].toString() == "http://json-schema.org/draft-07/schema#");
    REQUIRE(schema["$id"].toString() == "https://omega-synth.dev/schema/module-schema-7.2.json");
    REQUIRE(schema["title"].toString() == "OMEGA Aseptic Module Contract (Era 7)");
    REQUIRE(schema["type"].toString() == "object");

    auto* props = schema["properties"].getDynamicObject();
    REQUIRE(props != nullptr);
    REQUIRE(props->hasProperty("id"));
    REQUIRE(props->hasProperty("name"));
    REQUIRE(props->hasProperty("description"));

    auto* idProp = props->getProperty("id").getDynamicObject();
    REQUIRE(idProp != nullptr);
    REQUIRE(idProp->getProperty("type").toString() == "string");
    REQUIRE(idProp->getProperty("description").toString() == "Module unique identifier (snake_case)");
}

// ---------------------------------------------------------------------------
// exportComponentContract — identity
// ---------------------------------------------------------------------------

TEST_CASE("exportComponentContract exports core identity fields", "[exporter][identity]") {
    AceCatalog catalog;
    auto contract = AceContractExporter::exportComponentContract(makeValidComponent(), catalog);

    REQUIRE(contract["id"].toString() == "osc_va_basic");
    REQUIRE(contract["name"].toString() == "VA Basic Osc");
    REQUIRE(contract["description"].toString() == "Aseptic VA oscillator");
    REQUIRE(contract["family"].toString() == "oscillator");
    REQUIRE(contract["engine"].toString() == "Modular");
    REQUIRE((int)contract["version"] == 7);
    REQUIRE((int)contract["hp"] == 12);
}

TEST_CASE("exportComponentContract exports the Era 7 UI block", "[exporter][ui]") {
    auto info = makeValidComponent();

    UIItem control;
    control.bind = "freq";
    control.type = "knob";
    control.label = "Frequency";
    control.x = 10.0f;
    control.y = 20.0f;
    control.tab = "MAIN";
    info.uiControls.push_back(control);

    UIItem jack;
    jack.bind = "out";
    jack.type = "port";
    jack.label = "Output";
    info.uiJacks.push_back(jack);

    LayoutContainer container;
    container.id = "main";
    container.label = "Main";
    container.width = "full";
    container.height = 420.0f;
    container.variant = "default";
    container.zIndex = 1;
    container.labelPosition = "top";
    info.uiContainers.push_back(container);
    info.gridSnap = 5;

    AceCatalog catalog;
    auto contract = AceContractExporter::exportComponentContract(info, catalog);

    auto* ui = contract["ui"].getDynamicObject();
    REQUIRE(ui != nullptr);
    REQUIRE(ui->getProperty("skin").toString() == "industrial");

    auto* dims = ui->getProperty("dimensions").getDynamicObject();
    REQUIRE(dims != nullptr);
    REQUIRE((float)dims->getProperty("width") == Catch::Approx(60.0f));
    REQUIRE((float)dims->getProperty("height") == Catch::Approx(420.0f));

    auto* controls = ui->getProperty("controls").getArray();
    REQUIRE(controls != nullptr);
    REQUIRE(controls->size() == 1);
    auto* c0 = (*controls)[0].getDynamicObject();
    REQUIRE(c0->getProperty("bind").toString() == "freq");
    REQUIRE(c0->getProperty("type").toString() == "knob");
    auto* pos = c0->getProperty("pos").getDynamicObject();
    REQUIRE((float)pos->getProperty("x") == Catch::Approx(10.0f));
    REQUIRE((float)pos->getProperty("y") == Catch::Approx(20.0f));

    auto* jacks = ui->getProperty("jacks").getArray();
    REQUIRE(jacks != nullptr);
    REQUIRE(jacks->size() == 1);

    auto* layout = ui->getProperty("layout").getDynamicObject();
    REQUIRE(layout != nullptr);
    REQUIRE((int)layout->getProperty("gridSnap") == 5);
    auto* containers = layout->getProperty("containers").getArray();
    REQUIRE(containers != nullptr);
    REQUIRE(containers->size() == 1);
    auto* c1 = (*containers)[0].getDynamicObject();
    REQUIRE(c1->getProperty("id").toString() == "main");
    auto* c1size = c1->getProperty("size").getDynamicObject();
    REQUIRE(c1size != nullptr);
    REQUIRE(c1size->getProperty("w").toString() == "full");
    REQUIRE((float)c1size->getProperty("h") == Catch::Approx(420.0f));
}

TEST_CASE("exportComponentContract exports parameters and ports", "[exporter][params]") {
    auto info = makeValidComponent();

    PortDescriptor midiPort;
    midiPort.id = "midi_in";
    midiPort.label = "MIDI In";
    midiPort.type = ModPortType::MIDI;
    midiPort.isInput = true;
    midiPort.telemetryIndex = 1;
    info.ports.push_back(midiPort);

    PortDescriptor gatePort;
    gatePort.id = "gate_in";
    gatePort.label = "Gate In";
    gatePort.type = ModPortType::Gate;
    gatePort.isInput = true;
    gatePort.telemetryIndex = 2;
    info.ports.push_back(gatePort);

    AceCatalog catalog;
    auto contract = AceContractExporter::exportComponentContract(info, catalog);

    auto* params = contract["parameters"].getArray();
    REQUIRE(params != nullptr);
    REQUIRE(params->size() == 1);
    auto* p0 = (*params)[0].getDynamicObject();
    REQUIRE(p0->getProperty("id").toString() == "freq");
    REQUIRE(p0->getProperty("unit").toString() == "Hz");
    REQUIRE((float)p0->getProperty("min") == Catch::Approx(0.0f));
    REQUIRE((float)p0->getProperty("max") == Catch::Approx(1.0f));
    REQUIRE((float)p0->getProperty("default") == Catch::Approx(0.5f));
    REQUIRE((bool)p0->getProperty("modulable") == true);

    auto* ports = contract["ports"].getArray();
    REQUIRE(ports != nullptr);
    REQUIRE(ports->size() == 3);

    auto* port0 = (*ports)[0].getDynamicObject();
    REQUIRE(port0->getProperty("id").toString() == "out");
    REQUIRE(port0->getProperty("direction").toString() == "output");
    REQUIRE(port0->getProperty("type").toString() == "audio");

    auto* port1 = (*ports)[1].getDynamicObject();
    REQUIRE(port1->getProperty("type").toString() == "midi");
    REQUIRE(port1->getProperty("direction").toString() == "input");

    auto* port2 = (*ports)[2].getDynamicObject();
    REQUIRE(port2->getProperty("type").toString() == "gate");
}

// ---------------------------------------------------------------------------
// exportComponentContract — compliance report
// ---------------------------------------------------------------------------

TEST_CASE("exportComponentContract emits ok status for valid components", "[exporter][compliance]") {
    AceCatalog catalog;
    auto contract = AceContractExporter::exportComponentContract(makeValidComponent(), catalog);

    auto* compliance = contract["compliance"].getDynamicObject();
    REQUIRE(compliance != nullptr);
    REQUIRE(compliance->getProperty("status").toString() == "ok");
    REQUIRE(compliance->getProperty("firmwareHash").toString() == "abc123");

    auto* issues = compliance->getProperty("issues").getArray();
    REQUIRE(issues != nullptr);
    REQUIRE(issues->size() == 0);
}

TEST_CASE("exportComponentContract emits invalid status when identity is missing", "[exporter][compliance]") {
    ComponentInfo broken; // empty id/name/modelId

    AceCatalog catalog;
    auto contract = AceContractExporter::exportComponentContract(broken, catalog);

    auto* compliance = contract["compliance"].getDynamicObject();
    REQUIRE(compliance != nullptr);
    REQUIRE(compliance->getProperty("status").toString() == "invalid");

    auto* issues = compliance->getProperty("issues").getArray();
    REQUIRE(issues != nullptr);
    REQUIRE(issues->size() >= 1);
    auto* first = (*issues)[0].getDynamicObject();
    REQUIRE(first->getProperty("code").toString() == "IncompleteIdentity");
}

TEST_CASE("exportComponentContract emits degraded status for out-of-bounds entities", "[exporter][compliance]") {
    auto info = makeValidComponent();

    UIItem runaway;
    runaway.bind = "oob";
    runaway.type = "knob";
    runaway.label = "Out of bounds";
    runaway.x = 5000.0f; // far beyond 60px wide rack
    runaway.y = 5000.0f;
    info.uiControls.push_back(runaway);

    AceCatalog catalog;
    auto contract = AceContractExporter::exportComponentContract(info, catalog);

    auto* compliance = contract["compliance"].getDynamicObject();
    REQUIRE(compliance != nullptr);
    REQUIRE(compliance->getProperty("status").toString() == "degraded");

    auto* issues = compliance->getProperty("issues").getArray();
    REQUIRE(issues != nullptr);
    bool foundOutOfBounds = false;
    for (const auto& issue : *issues) {
        if (issue.getDynamicObject()->getProperty("code").toString() == "OutofBounds")
            foundOutOfBounds = true;
    }
    REQUIRE(foundOutOfBounds);
}

// ---------------------------------------------------------------------------
// Section builders (ExportUI / ExportControls / ExportAttachments)
// ---------------------------------------------------------------------------

TEST_CASE("ExportAttachments::attachmentToVar serializes a single attachment", "[exporter][attachments]") {
    Attachment att;
    att.type = "led";
    att.position = "top";
    att.bind = "out";
    att.text = "LIVE";
    att.variant = "pulse";
    att.offset = 2.5f;

    auto v = ExportAttachments::attachmentToVar(att);
    auto* o = v.getDynamicObject();
    REQUIRE(o != nullptr);
    REQUIRE(o->getProperty("type").toString() == "led");
    REQUIRE(o->getProperty("position").toString() == "top");
    REQUIRE(o->getProperty("bind").toString() == "out");
    REQUIRE(o->getProperty("text").toString() == "LIVE");
    REQUIRE(o->getProperty("variant").toString() == "pulse");
    REQUIRE((float)o->getProperty("offset") == Catch::Approx(2.5f));
}

TEST_CASE("ExportAttachments::attachmentsToVar serializes a list", "[exporter][attachments]") {
    std::vector<Attachment> atts;
    Attachment a1;
    a1.type = "led";
    Attachment a2;
    a2.type = "display";
    atts.push_back(a1);
    atts.push_back(a2);

    auto v = ExportAttachments::attachmentsToVar(atts);
    auto* arr = v.getArray();
    REQUIRE(arr != nullptr);
    REQUIRE(arr->size() == 2);
    REQUIRE((*arr)[0].getDynamicObject()->getProperty("type").toString() == "led");
    REQUIRE((*arr)[1].getDynamicObject()->getProperty("type").toString() == "display");
}

TEST_CASE("ExportControls::uiItemsToVar serializes items with pos + presentation + attachments", "[exporter][controls]") {
    UIItem item;
    item.bind = "freq";
    item.type = "knob";
    item.label = "Frequency";
    item.x = 10.0f;
    item.y = 20.0f;
    item.tab = "MAIN";
    item.container = "main";
    item.component = "rotary";
    item.variant = "default";

    Attachment led;
    led.type = "led";
    led.bind = "freq";
    item.attachments.push_back(led);

    std::vector<UIItem> items{ item };
    auto v = ExportControls::uiItemsToVar(items);
    auto* arr = v.getArray();
    REQUIRE(arr != nullptr);
    REQUIRE(arr->size() == 1);

    auto* o = (*arr)[0].getDynamicObject();
    REQUIRE(o->getProperty("bind").toString() == "freq");
    REQUIRE(o->getProperty("type").toString() == "knob");

    auto* pos = o->getProperty("pos").getDynamicObject();
    REQUIRE((float)pos->getProperty("x") == Catch::Approx(10.0f));
    REQUIRE((float)pos->getProperty("y") == Catch::Approx(20.0f));

    auto* pres = o->getProperty("presentation").getDynamicObject();
    REQUIRE(pres->getProperty("tab").toString() == "MAIN");
    REQUIRE(pres->getProperty("container").toString() == "main");
    REQUIRE(pres->getProperty("component").toString() == "rotary");

    auto* atts = pres->getProperty("attachments").getArray();
    REQUIRE(atts != nullptr);
    REQUIRE(atts->size() == 1);
}

TEST_CASE("ExportUI::uiToVar builds the complete Era 7 UI block", "[exporter][ui-builder]") {
    ComponentInfo info;
    info.uiSkin = "industrial";
    info.uiWidth = 60.0f;
    info.uiHeight = 420.0f;
    info.gridSnap = 5;

    UIItem control;
    control.bind = "freq";
    control.type = "knob";
    info.uiControls.push_back(control);

    LayoutContainer container;
    container.id = "main";
    container.label = "Main";
    container.x = 0.0f;
    container.y = 0.0f;
    container.width = "full";
    container.height = 420.0f;
    container.variant = "default";
    container.zIndex = 1;
    container.labelPosition = "top";
    info.uiContainers.push_back(container);

    auto v = ExportUI::uiToVar(info);
    auto* ui = v.getDynamicObject();
    REQUIRE(ui != nullptr);
    REQUIRE(ui->getProperty("skin").toString() == "industrial");

    auto* dims = ui->getProperty("dimensions").getDynamicObject();
    REQUIRE((float)dims->getProperty("width") == Catch::Approx(60.0f));
    REQUIRE((float)dims->getProperty("height") == Catch::Approx(420.0f));

    auto* controls = ui->getProperty("controls").getArray();
    REQUIRE(controls != nullptr);
    REQUIRE(controls->size() == 1);

    auto* jacks = ui->getProperty("jacks").getArray();
    REQUIRE(jacks != nullptr);
    REQUIRE(jacks->size() == 0);

    auto* layout = ui->getProperty("layout").getDynamicObject();
    REQUIRE((int)layout->getProperty("gridSnap") == 5);
    auto* containers = layout->getProperty("containers").getArray();
    REQUIRE(containers != nullptr);
    REQUIRE(containers->size() == 1);
    auto* c0 = (*containers)[0].getDynamicObject();
    REQUIRE(c0->getProperty("id").toString() == "main");
    REQUIRE((int)c0->getProperty("zIndex") == 1);
    auto* size = c0->getProperty("size").getDynamicObject();
    REQUIRE(size->getProperty("w").toString() == "full");
    REQUIRE((float)size->getProperty("h") == Catch::Approx(420.0f));
}
