#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <functional>

namespace Omega {
namespace Core {
namespace Input {

    /**
     * @brief Aseptic MIDI Processor for Era 7.2.3.
     * Handles MIDI ingestion, CC-to-Parameter mapping, and Note routing.
     */
    class MidiProcessor {
    public:
        using NoteTriggerCallback = std::function<void(int note, int velocity, bool on)>;
        using ParameterUpdateCallback = std::function<void(const std::string& paramId, float normalizedValue)>;

        MidiProcessor();

        /**
         * @brief Processes a block of MIDI messages.
         * Typically called from the Audio Processor's processBlock.
         */
        void processBuffer(const juce::MidiBuffer& buffer);

        // Callbacks
        void setNoteCallback(NoteTriggerCallback cb) { mNoteCallback = cb; }
        void setParamCallback(ParameterUpdateCallback cb) { mParamCallback = cb; }

    private:
        void handleMessage(const juce::MidiMessage& msg);

        NoteTriggerCallback mNoteCallback;
        ParameterUpdateCallback mParamCallback;
        
        int mGlobalChannel = 0; // 0 = Omni
    };

} // namespace Input
} // namespace Core
} // namespace Omega
