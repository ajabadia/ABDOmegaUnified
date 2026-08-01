#pragma once

#include "../Types/ModPortTypes.h"
#include <string>
#include <vector>

namespace Omega::Core::Modulation {

    /**
     * @brief Descriptor for a module input or output port.
     */
    struct PortDescriptor {
        std::string id;         // Internal ID (e.g., "pitch_in")
        std::string label;      // UI Label (e.g., "PITCH")
        ModPortType type;       // CV, Audio, etc.
        bool isInput = false;   // Direction
        int telemetryIndex = -1; // Mapping to high-speed buffer (-1 if not visualizable)
        
        float defaultValue = 0.0f;
        std::vector<PortOption> options; // Discrete values for UI (Optional)

        bool isFront = true;   // Visible in standard rack view
        bool isBack = false;   // Visible in engineering/back panel view
    };

    /**
     * @brief The Manifest: A module's "Social Contract".
     * Every module advertises its capabilities through this structure.
     */
    struct ModuleManifest {
        std::string instanceId;     // Unique in rack (e.g., "LFO-1")
        std::string modelId;        // Model reference (e.g., "LFO-STD-01")
        std::string category;       // Family (LFO, OSC, ENV, TRIG, etc.)
        std::string status;         // Lifecycle (active, bypass, loading, etc.)
        std::string author;         // Plugin author (OMEGA, 3rd Party, User)
        
        std::vector<PortDescriptor> ports;

        // Helpers to filter ports
        std::vector<PortDescriptor> getInputs() const {
            std::vector<PortDescriptor> results;
            for (const auto& p : ports) if (p.isInput) results.push_back(p);
            return results;
        }

        std::vector<PortDescriptor> getOutputs() const {
            std::vector<PortDescriptor> results;
            for (const auto& p : ports) if (!p.isInput) results.push_back(p);
            return results;
        }
    };

} // namespace Omega::Core::Modulation
