#include "MidiProcessor.h"
#include "../../Model/Parameters/ParameterMetadataRegistry.h"

namespace Omega {
namespace Core {
namespace Input {

    MidiProcessor::MidiProcessor() : mGlobalChannel(0) {}

    void MidiProcessor::processBuffer(const juce::MidiBuffer& buffer) {
        for (const auto metadata : buffer) {
            handleMessage(metadata.getMessage());
        }
    }

    void MidiProcessor::handleMessage(const juce::MidiMessage& msg) {
        // [Era 7.2.3] Strict Aseptic Filtering
        if (mGlobalChannel != 0 && msg.getChannel() != mGlobalChannel) return;

        if (msg.isNoteOn()) {
            if (mNoteCallback) mNoteCallback(msg.getNoteNumber(), msg.getVelocity(), true);
        }
        else if (msg.isNoteOff()) {
            if (mNoteCallback) mNoteCallback(msg.getNoteNumber(), 0, false);
        }
        else if (msg.isController()) {
            int cc = msg.getControllerNumber();
            float val = (float)msg.getControllerValue() / 127.0f;
            
            // Resolve CC to Parameter ID via Registry
            auto& registry = ::Omega::Core::ParameterMetadataRegistry::getInstance();
            std::string paramId = registry.getParamIdFromCC(cc);
            
            if (!paramId.empty() && mParamCallback) {
                mParamCallback(paramId, val);
            }
        }
    }

} // namespace Input
} // namespace Core
} // namespace Omega
