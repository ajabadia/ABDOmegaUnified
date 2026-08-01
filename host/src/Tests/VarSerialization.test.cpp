/**
 * Catch2 tests for VarSerialization (pure PatchDocument <-> juce::var helpers).
 * Moved from RpcPresetController.test.cpp in Fase 5.1 — serialization now
 * lives in its own module, decoupled from the controllers.
 *
 * Dependencies: juce_core (var/ValueTree) + PatchDocument types.
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "VarSerialization.h"

using namespace Omega::UI;
using namespace Omega::Core::Model;

// ---------------------------------------------------------------------------
// valueTreeToVar
// ---------------------------------------------------------------------------

TEST_CASE("valueTreeToVar returns void var for an invalid tree", "[serialization][valueTreeToVar]") {
    juce::ValueTree empty;
    auto var = VarSerialization::valueTreeToVar(empty);
    REQUIRE(var.isVoid());
}

TEST_CASE("valueTreeToVar copies primitive properties to a DynamicObject", "[serialization][valueTreeToVar]") {
    juce::ValueTree tree("Module");
    tree.setProperty("instanceId", 3, nullptr);
    tree.setProperty("name", "osc_va_basic", nullptr);
    tree.setProperty("gain", 0.5, nullptr);

    auto var = VarSerialization::valueTreeToVar(tree);

    auto* obj = var.getDynamicObject();
    REQUIRE(obj != nullptr);
    REQUIRE((int)obj->getProperty("instanceId") == 3);
    REQUIRE(obj->getProperty("name").toString() == "osc_va_basic");
    REQUIRE((double)obj->getProperty("gain") == Catch::Approx(0.5));
}

TEST_CASE("valueTreeToVar preserves string properties verbatim", "[serialization][valueTreeToVar]") {
    juce::ValueTree tree("Module");
    tree.setProperty("uuid", "123e4567-e89b-12d3-a456-426614174000", nullptr);

    auto var = VarSerialization::valueTreeToVar(tree);
    auto* obj = var.getDynamicObject();
    REQUIRE(obj != nullptr);
    REQUIRE(obj->getProperty("uuid").toString() == "123e4567-e89b-12d3-a456-426614174000");
}

TEST_CASE("valueTreeToVar does not copy child ValueTrees", "[serialization][valueTreeToVar]") {
    juce::ValueTree tree("Root");
    tree.setProperty("leaf", 1, nullptr);

    juce::ValueTree child("Child");
    child.setProperty("nested", 42, nullptr);
    tree.addChild(child, -1, nullptr);

    auto var = VarSerialization::valueTreeToVar(tree);
    auto* obj = var.getDynamicObject();
    REQUIRE(obj != nullptr);
    REQUIRE((int)obj->getProperty("leaf") == 1);
    REQUIRE(obj->getProperties().size() == 1); // children are NOT serialized
}

TEST_CASE("valueTreeToVar handles empty tree returning empty object", "[serialization][valueTreeToVar]") {
    juce::ValueTree tree("Empty");
    auto var = VarSerialization::valueTreeToVar(tree);
    auto* obj = var.getDynamicObject();
    REQUIRE(obj != nullptr);
    REQUIRE(obj->getProperties().size() == 0);
}

TEST_CASE("valueTreeToVar round-trips multiple property types", "[serialization][valueTreeToVar]") {
    juce::ValueTree tree("Settings");
    tree.setProperty("masterGainDb", -6.0, nullptr);
    tree.setProperty("globalTranspose", 2, nullptr);
    tree.setProperty("soloed", true, nullptr);

    auto var = VarSerialization::valueTreeToVar(tree);
    auto* obj = var.getDynamicObject();
    REQUIRE(obj != nullptr);
    REQUIRE((double)obj->getProperty("masterGainDb") == Catch::Approx(-6.0));
    REQUIRE((int)obj->getProperty("globalTranspose") == 2);
    REQUIRE((bool)obj->getProperty("soloed") == true);
}

// ---------------------------------------------------------------------------
// patchDocumentToVar / varToPatchDocument (round-trip)
// ---------------------------------------------------------------------------

TEST_CASE("patchDocumentToVar round-trips a full PatchDocument", "[serialization][roundtrip]") {
    PatchDocument doc;
    doc.metadata.uuid = "abc-123";
    doc.metadata.name = "Test Patch";
    doc.metadata.author = "ABD";
    doc.metadata.createdAt = 1000;
    doc.metadata.modifiedAt = 2000;
    doc.metadata.tags = { "osc", "va" };
    doc.masterGainDb = -3.5f;
    doc.globalTranspose = 2;
    doc.globalMidiChannel = 1;

    ModuleInstance mod;
    mod.instanceId = 7;
    mod.typeId = ModuleTypeId::VaOscillator;
    mod.position.rack = 1;
    mod.position.slot = 3;
    mod.position.order = 0;
    mod.parameters.push_back({ ParamId::Frequency, 0.5f, 0 });
    mod.flags.muted = true;
    doc.modules.push_back(mod);

    PatchConnection conn;
    conn.sourceModuleId = 7;
    conn.sourcePortId = 1;
    conn.targetModuleId = 8;
    conn.targetPortId = 2;
    conn.type = ConnectionType::CV;
    doc.connections.push_back(conn);

    PatchbayMatrixSlot slot;
    slot.source = "osc1.freq";
    slot.target = "flt.cutoff";
    slot.amount = 0.25f;
    slot.via = "";
    slot.viaAmount = 0.0f;
    slot.color = "#ff8800";
    slot.active = true;
    doc.patchbayMatrix.push_back(slot);

    auto var = VarSerialization::patchDocumentToVar(doc);
    auto restored = VarSerialization::varToPatchDocument(var);

    REQUIRE(restored.metadata.uuid == "abc-123");
    REQUIRE(restored.metadata.name == "Test Patch");
    REQUIRE(restored.metadata.author == "ABD");
    REQUIRE(restored.metadata.createdAt == 1000);
    REQUIRE(restored.metadata.modifiedAt == 2000);
    REQUIRE(restored.metadata.tags.size() == 2);
    REQUIRE(restored.metadata.tags[0] == "osc");
    REQUIRE(restored.masterGainDb == Catch::Approx(-3.5f));
    REQUIRE(restored.globalTranspose == 2);
    REQUIRE(restored.globalMidiChannel == 1);

    REQUIRE(restored.modules.size() == 1);
    REQUIRE(restored.modules[0].instanceId == 7);
    REQUIRE(restored.modules[0].typeId == ModuleTypeId::VaOscillator);
    REQUIRE(restored.modules[0].position.rack == 1);
    REQUIRE(restored.modules[0].position.slot == 3);
    REQUIRE(restored.modules[0].parameters.size() == 1);
    REQUIRE(restored.modules[0].parameters[0].id == ParamId::Frequency);
    REQUIRE(restored.modules[0].parameters[0].value == Catch::Approx(0.5f));
    REQUIRE(restored.modules[0].flags.muted == true);

    REQUIRE(restored.connections.size() == 1);
    REQUIRE(restored.connections[0].sourceModuleId == 7);
    REQUIRE(restored.connections[0].sourcePortId == 1);
    REQUIRE(restored.connections[0].type == ConnectionType::CV);

    REQUIRE(restored.patchbayMatrix.size() == 1);
    REQUIRE(restored.patchbayMatrix[0].source == "osc1.freq");
    REQUIRE(restored.patchbayMatrix[0].target == "flt.cutoff");
    REQUIRE(restored.patchbayMatrix[0].amount == Catch::Approx(0.25f));
    REQUIRE(restored.patchbayMatrix[0].color == "#ff8800");
    REQUIRE(restored.patchbayMatrix[0].active == true);
}

TEST_CASE("varToPatchDocument returns empty doc for a non-object var", "[serialization][roundtrip]") {
    auto restored = VarSerialization::varToPatchDocument(juce::var(42));
    REQUIRE(restored.metadata.uuid.empty());
    REQUIRE(restored.modules.empty());
    REQUIRE(restored.connections.empty());
}

TEST_CASE("varToPatchDocument handles a partial object with missing array keys", "[serialization][roundtrip][partial]") {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();
    obj->setProperty("masterGainDb", -6.0);
    obj->setProperty("globalTranspose", 3);
    obj->setProperty("globalMidiChannel", 2);

    juce::DynamicObject::Ptr meta = new juce::DynamicObject();
    meta->setProperty("name", "Partial Patch");
    meta->setProperty("tags", juce::Array<juce::var>{ "a", "b" });
    obj->setProperty("metadata", juce::var(meta.get()));

    // Deliberately omit modules / connections / patchbayMatrix keys
    auto restored = VarSerialization::varToPatchDocument(juce::var(obj.get()));

    // Scalar + metadata fields are restored
    REQUIRE(restored.masterGainDb == Catch::Approx(-6.0f));
    REQUIRE(restored.globalTranspose == 3);
    REQUIRE(restored.globalMidiChannel == 2);
    REQUIRE(restored.metadata.name == "Partial Patch");
    REQUIRE(restored.metadata.tags.size() == 2);
    REQUIRE(restored.metadata.tags[0] == "a");

    // Missing keys -> empty arrays, no crash
    REQUIRE(restored.modules.empty());
    REQUIRE(restored.connections.empty());
    REQUIRE(restored.patchbayMatrix.empty());
}

TEST_CASE("varToPatchDocument tolerates unexpected field types", "[serialization][roundtrip][partial]") {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();
    obj->setProperty("masterGainDb", -1.0);
    obj->setProperty("metadata", 42);                                   // number instead of object
    obj->setProperty("modules", "not-an-array");                       // string instead of array

    // connections: mix of invalid elements (int, string) AND one valid object
    juce::DynamicObject::Ptr connObj = new juce::DynamicObject();
    connObj->setProperty("sourceModuleId", 7);
    connObj->setProperty("sourcePortId", 1);
    connObj->setProperty("targetModuleId", 8);
    connObj->setProperty("targetPortId", 2);
    connObj->setProperty("type", (int)ConnectionType::CV);
    obj->setProperty("connections", juce::Array<juce::var>{
        juce::var(1), juce::var("x"), juce::var(connObj.get())
    });

    auto restored = VarSerialization::varToPatchDocument(juce::var(obj.get()));

    REQUIRE(restored.masterGainDb == Catch::Approx(-1.0f));
    REQUIRE(restored.metadata.uuid.empty());   // metadata skipped (wrong type)
    REQUIRE(restored.modules.empty());         // modules skipped (wrong type)
    REQUIRE(restored.patchbayMatrix.empty());

    // Invalid elements skipped, valid object parsed
    REQUIRE(restored.connections.size() == 1);
    REQUIRE(restored.connections[0].sourceModuleId == 7);
    REQUIRE(restored.connections[0].sourcePortId == 1);
    REQUIRE(restored.connections[0].targetModuleId == 8);
    REQUIRE(restored.connections[0].targetPortId == 2);
    REQUIRE(restored.connections[0].type == ConnectionType::CV);
}
