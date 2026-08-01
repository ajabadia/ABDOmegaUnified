#pragma once

#include "RpcBaseController.h"
#include "ParameterDescriptor.h"

namespace Omega {
    namespace Plugin { class OmegaAudioProcessor; }

namespace UI {

    /**
     * @brief Controller for Metadata, SampleRate, and Tempo.
     */
    class RpcMetadataController : public RpcBaseController {
    public:
        RpcMetadataController(Plugin::OmegaAudioProcessor* processor);

        juce::var handleGetMetadata(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetSampleRate(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetTempo(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetInventory(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetUiSchemas(const juce::var& requestId, const juce::var& payload);
        
        void registerCommands(RpcCommandDispatcher& dispatcher);

    private:
        Plugin::OmegaAudioProcessor* mProcessor;
        
        juce::var descriptorToVar(const Core::ParameterDescriptor& d);
    };

} // namespace UI
} // namespace Omega
