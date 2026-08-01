#pragma once

#include "Midi/MidiProcessor.h"
#include <memory>

namespace Omega {
namespace Core {
namespace Input {

    /**
     * @brief Orchestrator for all external control data.
     * Unifies MIDI, RPC, and internal modulation sources.
     */
    class InputManager {
    public:
        InputManager();
        
        MidiProcessor& getMidiProcessor() { return mMidiProcessor; }

        /**
         * @brief Global injection of a parameter change.
         */
        void injectParameterChange(const std::string& paramId, float value);

    private:
        MidiProcessor mMidiProcessor;
    };

} // namespace Input
} // namespace Core
} // namespace Omega
