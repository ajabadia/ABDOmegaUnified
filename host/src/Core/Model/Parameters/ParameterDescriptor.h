#pragma once

#include "ParameterTypes.h"
#include <string>
#include <vector>
#include <juce_core/juce_core.h>

namespace Omega::Core {

    /**
     * @brief Descriptor for a single synthesizer parameter.
     * Unifies UI, MIDI, and DSP logic under a single technical contract.
     */
    struct ParameterDescriptor {
        std::string id;
        std::string name;
        std::string description;
        
        ParamValueType valueType = ParamValueType::Continuous;
        
        float minValue = 0.0f;
        float maxValue = 1.0f;
        float defaultValue = 0.5f;
        float step = 0.0f;
        float skew = 1.0f; 
        
        std::string unit = "%";
        std::string groupId = "Global";
        std::string category = "synthesis"; // synthesis, modulation, midi, global
        std::string uiControl = "knob";     // knob, switch, select, slider, button
        
        bool expert = false;
        
        // MIDI Mapping (CC)
        int ccNumber = -1;
        
        // Modulation Binding
        ModSource modSource = ModSource::Count;

        // Telemetry Index
        int telemetryIndex = -1;
        
        // JUCE ValueTree Property
        juce::Identifier valueTreePropertyId;

        std::vector<ParameterOption> options;
    };

} // namespace Omega::Core
