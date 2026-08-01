#include "AceValidator.h"

namespace Omega::Core::Ace {

    ValidationReport AceValidator::validateManifest(const ComponentInfo& info) const {
        ValidationReport report;
        
        // 1. Core Identity Check
        if (info.id.empty() || info.name.empty() || info.modelId.empty()) {
            ValidationIssue issue;
            issue.severity = ValidationStatus::Invalid;
            issue.code = "IncompleteIdentity";
            issue.scope = info.id;
            issue.message = "Module manifest is missing basic identity (id, name or modelId).";
            report.issues.push_back(issue);
            report.status = ValidationStatus::Invalid;
        }

        // 2. Era 6.3 Visibility Enforcement
        if (info.version >= 1) { 
            for (const auto& p : info.parameters) {
                if (p.id.empty() || p.label.empty()) {
                    ValidationIssue issue;
                    issue.severity = ValidationStatus::Invalid;
                    issue.code = "BrokenParameter";
                    issue.scope = info.id + "." + p.id;
                    issue.message = "Parameter is missing ID or Label.";
                    report.issues.push_back(issue);
                    report.status = ValidationStatus::Invalid;
                }
            }
        }

        // 3. Aseptic Sanitization
        bool hasFront = false;
        for (const auto& p : info.parameters) if (p.front) { hasFront = true; break; }
        
        if (!hasFront && !info.parameters.empty()) {
            ValidationIssue issue;
            issue.severity = ValidationStatus::Degraded;
            issue.code = "GhostModule";
            issue.scope = info.id;
            issue.message = "Module has NO front-panel parameters.";
            report.issues.push_back(issue);
            if (report.status == ValidationStatus::Ok) report.status = ValidationStatus::Degraded;
        }

        // 4. Structural Integrity Check (Era 7.2.3)
        float rackW = info.uiWidth > 0 ? info.uiWidth : (float)(info.hp * 15);
        float rackH = info.uiHeight > 0 ? info.uiHeight : 420.0f;

        // 4.1 Container Integrity
        for (const auto& c : info.uiContainers) {
            float cW = 0;
            if (c.width == "full") cW = rackW;
            else if (c.width == "3/4") cW = rackW * 0.75f;
            else if (c.width == "1/2") cW = rackW * 0.5f;
            else if (c.width == "1/4") cW = rackW * 0.25f;
            else try { cW = std::stof(c.width); } catch (...) { cW = rackW; }

            if (c.x < 0 || c.y < 0 || (c.x + cW) > rackW || (c.y + c.height) > rackH) {
                ValidationIssue issue;
                issue.severity = ValidationStatus::Degraded;
                issue.code = "SpatialLeak";
                issue.scope = info.id + ".layout." + c.id;
                issue.message = "Container '" + c.id + "' exceeds Rack boundaries.";
                
                auto meta = new juce::DynamicObject();
                meta->setProperty("x", c.x);
                meta->setProperty("y", c.y);
                meta->setProperty("w", cW);
                meta->setProperty("h", c.height);
                issue.metadata = juce::var(meta);

                report.issues.push_back(issue);
                if (report.status == ValidationStatus::Ok) report.status = ValidationStatus::Degraded;
            }
        }

        // 4.2 Entity Integrity
        auto checkEntities = [&](const std::vector<UIItem>& items, const std::string& type) {
            for (const auto& item : items) {
                if (item.x < 0 || item.y < 0 || item.x > rackW || item.y > rackH) {
                    ValidationIssue issue;
                    issue.severity = ValidationStatus::Degraded;
                    issue.code = "OutofBounds";
                    issue.scope = info.id + "." + type + "." + item.bind;
                    issue.message = "Entity '" + item.bind + "' is outside the area.";
                    
                    auto meta = new juce::DynamicObject();
                    meta->setProperty("x", item.x);
                    meta->setProperty("y", item.y);
                    issue.metadata = juce::var(meta);

                    report.issues.push_back(issue);
                    if (report.status == ValidationStatus::Ok) report.status = ValidationStatus::Degraded;
                }
            }
        };

        checkEntities(info.uiControls, "controls");
        checkEntities(info.uiJacks, "jacks");

        return report;
    }

} // namespace Omega::Core::Ace
