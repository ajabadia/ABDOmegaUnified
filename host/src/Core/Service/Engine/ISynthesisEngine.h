#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

namespace Omega::Core::Service {

    /**
     * @brief Master Synthesis Engine Interface (The Central Contract).
     * This interface defines the minimum technical requirements for any 
     * sound generation engine within the OMEGA platform.
     */
    class ISynthesisEngine {
    public:
        virtual ~ISynthesisEngine() = default;

        // Lifecycle
        virtual void prepare(double sampleRate, int samplesPerBlock) = 0;
        virtual void reset() = 0;

        // Audio Processing (Thread-Safe)
        virtual void renderNextBlock(::juce::AudioBuffer<float>& buffer) noexcept = 0;

        // Control
        virtual void noteOn(int voiceIndex, float freqHz) noexcept = 0;
        virtual void noteOff(int voiceIndex) noexcept = 0;

        // Fidelity & Visualization
        virtual void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept = 0;
    };

} // namespace Omega::Core::Service
