#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

namespace Omega {
namespace Plugin {
namespace ParameterLayoutBuilder {

    /**
     * @brief Builds the JUCE AudioProcessorValueTreeState parameter layout
     * from the Omega::Core::ParameterMetadataRegistry.
     * Decoupled from OmegaAudioProcessor lifecycle (Fase 5.3).
     */
    juce::AudioProcessorValueTreeState::ParameterLayout build();

} // namespace ParameterLayoutBuilder
} // namespace Plugin
} // namespace Omega
