#pragma once

#include <cstdint>

namespace Omega {
namespace Core {
namespace Modulation {

    /**
     * @brief Unique Node Identifier.
     */
    using NodeId = uint32_t;

    /**
     * @brief Node types available in the modulation graph.
     * Defined in Core to allow metadata classes to reference types without Engine dependency.
     */
    enum class NodeType : uint8_t {
        LFO,
        Envelope,       // ADSR / Multi-stage
        MIDIInput,      // Velocity, ModWheel, Aftertouch
        Mix,            // Addition
        Multiply,       // Multiplication (VCA style / Depth control)
        Scale,
        Curve,          // Shaper / Response
        VoicePitch,
        FilterCutoff,
        CustomParameter
    };

} // namespace Modulation
} // namespace Core
} // namespace Omega
