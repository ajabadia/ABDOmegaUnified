#include "ParameterLayoutBuilder.h"
#include "ParameterMetadataRegistry.h"

namespace Omega {
namespace Plugin {
namespace ParameterLayoutBuilder {

    juce::AudioProcessorValueTreeState::ParameterLayout build() {
        juce::AudioProcessorValueTreeState::ParameterLayout layout;
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        for (auto const& [id, desc] : registry.getAllParameters()) {
            layout.add(std::make_unique<juce::AudioParameterFloat>(
                juce::ParameterID(juce::String(id), 1),
                desc.name,
                juce::NormalisableRange<float>(desc.minValue, desc.maxValue),
                desc.defaultValue));
        }
        return layout;
    }

} // namespace ParameterLayoutBuilder
} // namespace Plugin
} // namespace Omega
