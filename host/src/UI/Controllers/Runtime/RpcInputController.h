#pragma once

#include "RpcBaseController.h"

namespace Omega {
    namespace Plugin { class OmegaAudioProcessor; }

namespace UI {

    /**
     * @brief Controller for Note triggers and Host input.
     */
    class RpcInputController : public RpcBaseController {
    public:
        RpcInputController(Plugin::OmegaAudioProcessor* processor);

        juce::var handleTriggerNote(const juce::var& requestId, const juce::var& payload);

        void registerCommands(RpcCommandDispatcher& dispatcher);

    private:
        Plugin::OmegaAudioProcessor* mProcessor;
    };

} // namespace UI
} // namespace Omega
