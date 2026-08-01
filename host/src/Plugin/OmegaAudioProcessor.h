#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include <atomic>
#include <memory>
#include <mutex>
/** [BUILD_FORCE_16] Absolute Aseptic Restoration of OMEGA Processor (Era 7). **/
#include "VirtualAnalogEngine.h"
#include "AceCatalog.h"
#include "AceValidator.h"
#include "SystemSettingsManager.h"
#include "EngineConfigManager.h"
#include "OmegaUiBridge.h"



namespace Omega::Plugin {

    /**
     * @brief Main OMEGA Processor (Era 7 Aseptic).
     * Purely decoupled from legacy DSP vestigies (Roland, Korg, FX pools).
     */
    class OmegaAudioProcessor : public juce::AudioProcessor, private juce::Timer {
    public:
        OmegaAudioProcessor();
        ~OmegaAudioProcessor() override;

        // --- JUCE Overrides ---
        void prepareToPlay(double sampleRate, int samplesPerBlock) override;
        void releaseResources() override;
        void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;
        void processBlockBypassed(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

        juce::AudioProcessorEditor* createEditor() override;
        bool hasEditor() const override;

        const juce::String getName() const override;
        bool acceptsMidi() const override;
        bool producesMidi() const override;
        double getTailLengthSeconds() const override;

        int getNumPrograms() override;
        int getCurrentProgram() override;
        void setCurrentProgram(int index) override;
        const juce::String getProgramName(int index) override;
        void changeProgramName(int index, const juce::String& newName) override;

        void getStateInformation(juce::MemoryBlock& destData) override;
        void setStateInformation(const void* data, int sizeInBytes) override;

        // --- Omega Specific ---
        void loadPatch(const Core::Model::PatchDocument& patch);
        void saveCurrentPatch();
        static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

        // ACE System
        const Core::Ace::AceCatalog& getCatalog() const noexcept { return mCatalog; }
        Core::Service::EngineConfigManager& getEngineConfigManager() noexcept { return mEngineConfig; }
        Core::Service::SystemSettingsManager& getSystemSettings() noexcept { return mSystemSettings; }

        // MIDI Triggering (Thread-safe)
        void triggerNote(int midiNote, int velocity, bool isOn);

    private:
        void timerCallback() override;
        void updateParameters() noexcept;

        // ACE System
        Core::Ace::AceCatalog mCatalog;
        Core::Ace::AceValidator mValidator;
        
        // Global Services
        Core::Service::SystemSettingsManager mSystemSettings;

        // Audio Engine (Era 7 Aseptic Path)
        ::Omega::Engine::Modular::VirtualAnalogEngine mEngine;
        
        // State
        juce::AudioProcessorValueTreeState mApvts;

        // Voice Allocator
        int mNoteToVoice[128];
        int mVoiceLastUsed[16];
        int mAllocTime = 0;

        // Async catalog guard
        std::once_flag mCatalogOnceFlag;
        
        // High-Level Facades
        Core::Service::EngineConfigManager mEngineConfig;
        UI::OmegaUiBridge mUiBridge;

        // Dynamic Parameter Registry (Lock-free mapping)
        std::vector<std::atomic<float>*> mParamPointers;

        juce::MidiBuffer mUiMidiQueue;
        juce::CriticalSection mUiMidiLock;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaAudioProcessor)
    };

} // namespace Omega::Plugin
