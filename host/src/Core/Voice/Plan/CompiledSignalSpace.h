#pragma once

#include <cstdint>

namespace Omega::Core::Voice {

    /**
     * @brief Unified signal space indexing for modulation sources (LFOs, Envelopes, MIDI).
     * Defines the numeric address space for all internal and external modulation signals.
     */
    struct CompiledSignalSpace {
        static constexpr uint8_t kInvalid = 0xFF;
        
        // Internal Sources (0-127)
        static constexpr uint8_t lfo(int index)    { return static_cast<uint8_t>(index); }        // 0-15
        static constexpr uint8_t env(int index)    { return static_cast<uint8_t>(16 + index); }   // 16-31
        static constexpr uint8_t adsr(int index)   { return static_cast<uint8_t>(32 + index); }   // 32-47
        
        // MIDI-to-CV published signals
        static constexpr uint8_t kMidiToCvPitch      = 60;
        static constexpr uint8_t kMidiToCvGate       = 61;
        static constexpr uint8_t kMidiToCvVelocity   = 62;
        static constexpr uint8_t kMidiToCvModWheel   = 63;
        static constexpr uint8_t kMidiToCvAftertouch = 64;
        static constexpr uint8_t kMidiToCvPitchBend  = 65;
        static constexpr uint8_t kMidiToCvTimbre     = 66;

        // External / Performance Sources (128-255)
        static constexpr uint8_t kPitchBend       = 128;
        static constexpr uint8_t kModWheel        = 129;
        static constexpr uint8_t kAftertouch      = 130;
        static constexpr uint8_t kVelocity        = 131;
        static constexpr uint8_t kNoteNumber      = 132;
        static constexpr uint8_t kExpression      = 133;
        
        // Internal Routing (240-254)
        static constexpr uint8_t kMidiLink        = 250; 

        // --- Era 6.3 System Environment Signals (200-209) ---
        static constexpr uint8_t kSystemSampleRate  = 200;
        static constexpr uint8_t kSystemBlockSize   = 201;
        static constexpr uint8_t kSystemMidiProtocol = 202;

        // Common Semantic Aliases
        static constexpr uint8_t compiledLfo1()    { return lfo(0); }
        static constexpr uint8_t compiledEnv1Amp() { return adsr(0); }
    };

} // namespace Omega::Core::Voice
