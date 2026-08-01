#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "RpcBaseController.h"
#include "RpcCommandDispatcher.h"

namespace Omega {
    namespace Plugin { class OmegaAudioProcessor; }

namespace UI {

    /**
     * @brief Controller for parameter mutations (Era 7).
     * Decoupled from legacy preset state.
     */
    class RpcParameterController : public RpcBaseController {
    public:
        RpcParameterController(Plugin::OmegaAudioProcessor* processor, juce::AudioProcessorValueTreeState& apvts);

        void setupParameterCommands(RpcCommandDispatcher& dispatcher);

        juce::var handleSetParameter(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetState(const juce::var& requestId, const juce::var& payload);

    private:
        Plugin::OmegaAudioProcessor* mProcessor;
        juce::AudioProcessorValueTreeState& mApvts;
    };

} // namespace UI
} // namespace Omega
