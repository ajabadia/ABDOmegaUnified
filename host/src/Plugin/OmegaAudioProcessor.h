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
#include "PatchRepository.h"
#include "TailLength.h"



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
        /**
         * [P0-2] Enruta un mensaje MIDI del sistema hacia el módulo midi_in del
         * rack (modelo modular puro: el MIDI solo entra por midi_in y viaja por
         * cables; si el rack no tiene midi_in, el mensaje se ignora). Los eventos
         * de nota asignan voz (LRU) igual que triggerNote, pero NO disparan el
         * engine directamente — la voz se activa cuando midi_in reenvía el
         * mensaje y omega_publish_midi dispara VirtualAnalogEngine::onModuleMidi.
         */
        void dispatchSystemMidi(uint8_t status, uint8_t d1, uint8_t d2);

        /**
         * [P0-2] true si el snapshot actual contiene una unidad con moduleId
         * "midi_in" (el puente de entrada del rack).
         */
        bool planHasMidiIn() const noexcept;

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
        // [P0-1] mVoiceLastUsed ligado al techo canónico del settings (kMaxVoices).
        // Antes: literal 16 suelto, inconsistente con el setting "numVoices".
        int mNoteToVoice[128];
        int mVoiceLastUsed[Core::Service::SystemSettingsManager::kMaxVoices];
        int mAllocTime = 0;

        // Async catalog guard
        std::once_flag mCatalogOnceFlag;
        
        // High-Level Facades
        Core::Service::EngineConfigManager mEngineConfig;

        // [P0-3] Persistencia de patches a disco (%AppData%/ABDOmega/patches).
        // saveCurrentPatch() escribe current.patch.json (autosave de sesión) y
        // prepareToPlay lo restaura en el arranque si existe.
        UI::Persistence::PatchRepository mPatchRepository;

        UI::OmegaUiBridge mUiBridge;

        // Dynamic Parameter Registry (Lock-free mapping)
        std::vector<std::atomic<float>*> mParamPointers;

        // [P1-4] Cola de release declarada al host (getTailLengthSeconds).
        // Cache atómica: la actualiza el timer de 30 ms (mismo hilo que el resto
        // del polling de parámetros) leyendo el release REAL del APVTS; el host
        // la lee desde el hilo de audio → nunca clics por offlining prematuro.
        std::atomic<double> mTailLengthSeconds { 0.1 };

        /** [P1-4] Puntero al valor normalizado (0-1) de layer.a.env.release. */
        std::atomic<float>* mReleaseParam = nullptr;

        juce::MidiBuffer mUiMidiQueue;
        juce::CriticalSection mUiMidiLock;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaAudioProcessor)
    };

} // namespace Omega::Plugin
