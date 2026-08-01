/**
 * Catch2 tests for ParameterLayoutBuilder (Fase 5.3).
 *
 * NOTE: In JUCE 8, AudioProcessorValueTreeState::ParameterLayout is an opaque
 * storage type (no getParameters()/getParameter() accessors), so the tests
 * verify the builder by hosting the layout in an AudioProcessorValueTreeState
 * backed by a minimal test processor — the same consumption path used by
 * OmegaAudioProcessor.
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "ParameterLayoutBuilder.h"
#include "ParameterMetadataRegistry.h"

using namespace Omega::Plugin;
using namespace Omega::Core;

namespace {

/** Minimal AudioProcessor to host an APVTS in a headless unit test. */
class TestProcessor final : public juce::AudioProcessor {
public:
    TestProcessor()
        : juce::AudioProcessor (juce::AudioProcessor::BusesProperties()
                                    .withOutput ("Output", juce::AudioChannelSet::stereo(), true)) {}

    const juce::String getName() const override { return "TestProcessor"; }
    void prepareToPlay(double, int) override {}
    void releaseResources() override {}
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) override { buffer.clear(); }
    void processBlock(juce::AudioBuffer<double>& buffer, juce::MidiBuffer&) override { buffer.clear(); }
    juce::AudioProcessorEditor* createEditor() override { return nullptr; }
    bool hasEditor() const override { return false; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}
    void getStateInformation(juce::MemoryBlock&) override {}
    void setStateInformation(const void*, int) override {}
};

} // namespace

TEST_CASE("ParameterLayoutBuilder layout exposes every registered parameter via APVTS", "[plugin][parameterlayout]") {
    // NOTE: No explicit initializeDefaults() call — the registry self-initializes
    // in its constructor. This test is the regression guard for that fix.
    auto& registry = ParameterMetadataRegistry::getInstance();

    TestProcessor processor;
    juce::AudioProcessorValueTreeState apvts (processor, nullptr, "PARAMETERS", ParameterLayoutBuilder::build());

    const auto& allParams = registry.getAllParameters();
    REQUIRE(!allParams.empty());

    // Exact count: the APVTS constructor adds each layout parameter to the processor
    REQUIRE((size_t)processor.getParameters().size() == allParams.size());

    for (const auto& entry : allParams)
        REQUIRE(apvts.getParameter(juce::String(entry.first)) != nullptr);
}

TEST_CASE("ParameterLayoutBuilder preserves min/max ranges from the descriptor", "[plugin][parameterlayout]") {
    TestProcessor processor;
    juce::AudioProcessorValueTreeState apvts (processor, nullptr, "PARAMETERS", ParameterLayoutBuilder::build());

    // Known descriptor: layer.a.cutoff -> 20..20000 Hz
    REQUIRE(apvts.getParameter(juce::String("layer.a.cutoff")) != nullptr);

    auto range = apvts.getParameterRange(juce::String("layer.a.cutoff"));
    REQUIRE(range.start == Catch::Approx(20.0f));
    REQUIRE(range.end == Catch::Approx(20000.0f));
}
