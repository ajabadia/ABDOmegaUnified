#pragma once

#include "../Types/ModulationTypes.h"
#include <string>
#include <vector>

namespace Omega::Core::Modulation {

    /**
     * @brief High-level categories for modulation sources.
     */
    enum class SourceCategory {
        LFO,
        Envelope,
        MIDI,
        Macro,
        Internal
    };

    /**
     * @brief Descriptor for a modulation source.
     */
    struct SourceDescriptor {
        std::string id;             // e.g. "lfo.1"
        std::string name;           // e.g. "LFO 1"
        SourceCategory category;
        NodeType graphNodeType;
        int voiceIndex;             // -1 for global, 0+ for per-voice
    };

    /**
     * @brief Descriptor for a modulation destination.
     */
    struct TargetDescriptor {
        std::string id;             // e.g. "layer.a.cutoff"
        std::string name;           // e.g. "VCF Cutoff"
        NodeType graphNodeType;
        std::string parameterId;    // The actual param ID linked to this sink
    };

    /**
     * @brief Stable IDs for modulation targets (used in CompiledVoicePlan).
     */
    enum class TargetStableId : uint32_t {
        None = 0,
        Pitch = 1,
        Cutoff = 2,
        Resonance = 3,
        VcaGain = 4,
        PwmAmount = 5,
        LfoRate = 6,
        EnvAttack = 7,
        EnvDecay = 8,
        EnvSustain = 9,
        EnvRelease = 10,
        Gate = 11,
        Custom = 100 
    };

} // namespace Omega::Core::Modulation
