#include "AceContractExporter.h"
#include "../Validation/AceValidator.h"
#include "ExportUI.h"

namespace Omega {
namespace Core {
namespace Ace {

    juce::var AceContractExporter::exportComponentContract(const ComponentInfo& info, const AceCatalog& catalog) {
        auto contract = new juce::DynamicObject();
        contract->setProperty("id", juce::String(info.id));
        contract->setProperty("name", juce::String(info.name));
        contract->setProperty("description", juce::String(info.description));
        contract->setProperty("family", juce::String(info.family));
        contract->setProperty("engine", juce::String(info.engine));
        contract->setProperty("version", info.version);
        contract->setProperty("hp", info.hp);

        // ERA 7 UI BLOCK — delegated to pure section builders (ExportUI/ExportControls/ExportAttachments)
        contract->setProperty("ui", ExportUI::uiToVar(info));

        // ERA 7.2.3: Detailed Compliance Report
        AceValidator validator(catalog);
        auto report = validator.validateManifest(info);
        
        auto complianceObj = new juce::DynamicObject();
        complianceObj->setProperty("status", report.status == ValidationStatus::Ok ? "ok" : 
                                            (report.status == ValidationStatus::Degraded ? "degraded" : "invalid"));
        
        juce::Array<juce::var> issuesArr;
        for (const auto& issue : report.issues) {
            auto iobj = new juce::DynamicObject();
            iobj->setProperty("severity", issue.severity == ValidationStatus::Ok ? "ok" : 
                                         (issue.severity == ValidationStatus::Degraded ? "degraded" : "invalid"));
            iobj->setProperty("code", juce::String(issue.code));
            iobj->setProperty("scope", juce::String(issue.scope));
            iobj->setProperty("message", juce::String(issue.message));
            iobj->setProperty("metadata", issue.metadata);
            issuesArr.add(juce::var(iobj));
        }
        complianceObj->setProperty("issues", issuesArr);
        complianceObj->setProperty("firmwareHash", juce::String(info.manifestHash));
        contract->setProperty("compliance", juce::var(complianceObj));

        // Parameters
        juce::Array<juce::var> params;
        for (const auto& p : info.parameters) {
            auto pobj = new juce::DynamicObject();
            pobj->setProperty("id", juce::String(p.id));
            pobj->setProperty("label", juce::String(p.label));
            pobj->setProperty("unit", juce::String(p.unit));
            pobj->setProperty("min", p.min);
            pobj->setProperty("max", p.max);
            pobj->setProperty("default", p.defaultValue);
            pobj->setProperty("modulable", p.modulable);
            params.add(juce::var(pobj));
        }
        contract->setProperty("parameters", params);

        // Ports
        juce::Array<juce::var> ports;
        for (const auto& p : info.ports) {
            auto pobj = new juce::DynamicObject();
            pobj->setProperty("id", juce::String(p.id));
            pobj->setProperty("label", juce::String(p.label));
            pobj->setProperty("direction", p.isInput ? "input" : "output");
            
            juce::String typeStr = "cv";
            if (p.type == Modulation::ModPortType::Audio) typeStr = "audio";
            else if (p.type == Modulation::ModPortType::MIDI) typeStr = "midi";
            else if (p.type == Modulation::ModPortType::Gate) typeStr = "gate";
            
            pobj->setProperty("type", typeStr);
            ports.add(juce::var(pobj));
        }
        contract->setProperty("ports", ports);

        return juce::var(contract);
    }

    juce::var AceContractExporter::generateSchema() {
        auto schema = new juce::DynamicObject();
        schema->setProperty("$schema", "http://json-schema.org/draft-07/schema#");
        schema->setProperty("$id", "https://omega-synth.dev/schema/module-schema-7.2.json");
        schema->setProperty("title", "OMEGA Aseptic Module Contract (Era 7)");
        schema->setProperty("type", "object");

        auto props = new juce::DynamicObject();
        
        auto createStringProp = [](const juce::String& desc) {
            auto p = new juce::DynamicObject();
            p->setProperty("type", "string");
            p->setProperty("description", desc);
            return juce::var(p);
        };

        props->setProperty("id", createStringProp("Module unique identifier (snake_case)"));
        props->setProperty("name", createStringProp("Display name"));
        props->setProperty("description", createStringProp("Module purpose and documentation"));
        
        schema->setProperty("properties", juce::var(props));
        return juce::var(schema);
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
