#pragma once

#include <string>
#include <vector>
#include <map>
#include <juce_core/juce_core.h>
#include "ModuleManifest.h"

namespace Omega {
namespace Core {
namespace Ace {

    /**
     * @brief Visual attachment types for control cells.
     */
    struct Attachment {
        std::string type;     // "label", "led", "display"
        std::string position; // "top", "bottom", "left", "right"
        std::string bind;     
        std::string text;
        std::string variant;
        float offset = 0.0f;
    };

    /**
     * @brief Visual representation of an element in the rack.
     */
    struct UIItem {
        std::string bind;
        std::string type;
        std::string label;
        float x = 0;
        float y = 0;
        float height = 0; // [NEW] Era 7.2.3 Shadow Physics
        std::string tab;
        std::string container; // Era 7.2: Canonical container ID
        std::string group;     // Legacy Era 7.1
        std::string component;
        std::string variant;
        std::vector<Attachment> attachments;
    };

    /**
     * @brief Declarative architectural container (Era 7.2).
     */
    struct LayoutContainer {
        std::string id;
        std::string label;
        float x = 0;
        float y = 0;
        std::string width;  // 'full', '1/2', '3/4', etc. or px value
        float height = 0;
        std::string variant;
        std::string tab;    // Era 7.2: Architectural Plane (Tab ID)
        int zIndex = 0;
        std::string labelPosition; // "top", "bottom", "inside-top", "inside-bottom"
    };

    /**
     * @brief ACE component parameter definition.
     */
    struct ParameterDef {
        std::string id;
        std::string label;
        std::string unit;
        float min = 0.0f;
        float max = 1.0f;
        float defaultValue = 0.0f;
        bool modulable = true;
        std::vector<Modulation::PortOption> options;

        // Engine Compatibility (Era 6.3)
        bool front = true;
        bool back = true;
    };

    /**
     * @brief OMEGA Atmospheric Physics (Era 7.2.3).
     */
    struct LightingInfo {
        float shadowAngle = 135.0f;
        float distance = 4.0f;
        float blur = 4.0f;
        std::string shadowColor = "rgba(0,0,0,0.5)";
    };

    /**
     * @brief Extended information of an ACE component (Era 7 Industrial).
     */
    struct ComponentInfo {
        std::string id;
        std::string name;
        std::string description;
        std::string family;   
        std::string engine;   
        int version = 7;
        
        // Logical Registry
        std::vector<ParameterDef> parameters;
        std::vector<Modulation::PortDescriptor> ports;
        std::map<std::string, float> defaultParams; 

        // Engine Registry (Legacy Compatibility)
        std::string modelId;
        uint32_t implementationId = 0;
        
        // Era 7 UI Block
        std::string uiSkin;
        float uiWidth = 0;
        float uiHeight = 0;
        LightingInfo lighting;                     // [NEW] Era 7.2.3 Shadow Physics
        std::vector<UIItem> uiControls;
        std::vector<UIItem> uiJacks;
        std::vector<LayoutContainer> uiContainers; // Era 7.2
        int gridSnap = 5;                           // Era 7.2
        
        // Era 7.2.3 Aesthetic Decoupling (Baking)
        std::map<std::string, std::string> uiColors;
        std::map<std::string, std::string> uiTypography;
        std::string faceplateAsset;
        
        std::string manifestHash;                   // Era 7.2.3: SHA-256 Firmware Integrity

        // Extended Identity
        std::vector<std::string> tags;
        int hp = 0;
        std::string rack;
        std::string registryRole; // ERA 4 Governance
        std::string vendorId;     // ERA 4 Governance

        // Extra Resource Support (Era 7.1)
        std::string sourcePath;
        bool isPackaged = false;
        bool isCompliant = false;
    };

    /**
     * @brief Result of a component validation.
     */
    enum class ValidationStatus {
        Ok,
        Degraded,
        Invalid
    };

    /**
     * @brief Detailed issue found during validation.
     */
    struct ValidationIssue {
        ValidationStatus severity;
        std::string scope;   
        std::string code;    
        std::string message;
        juce::var metadata;  
    };

    /**
     * @brief Complete validation report.
     */
    struct ValidationReport {
        ValidationStatus status { ValidationStatus::Ok };
        std::vector<ValidationIssue> issues;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
