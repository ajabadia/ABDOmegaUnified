#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
/** [BUILD_FORCE_72] OMEGA Engine Orchestrator (Era 7.2.3). **/
#include <array>
#include <atomic>
#include <string>

#include "ISynthesisEngine.h"
#include "OmegaAsepticVoice.h"
#include "ModulationTelemetryHub.h"
#include "ModulationTelemetryRegistry.h"
#include "PerformanceMonitor.h"
#include "PatchDocument.h"
#include "RuntimeSnapshot.h"
#include "SystemSettingsManager.h"
#include "ParamIdRegistry.h"
#include "VoiceState.h"
#include "ModulationRuntime.h"

namespace Omega::Engine::Modular {

    /**
     * @brief OMEGA Industrial Engine Orchestrator.
     * Pure Container: Manages voice lifecycle and global modulation.
     */
    class VirtualAnalogEngine : public ::Omega::Core::Service::ISynthesisEngine {
    public:
        VirtualAnalogEngine(::Omega::Core::Service::SystemSettingsManager& settings);

        void prepare(double sampleRate, int samplesPerBlock) override;
        void reset() override;
        void renderNextBlock(::juce::AudioBuffer<float>& buffer) noexcept override;

        void noteOn(int voiceIndex, float freqHz) noexcept override;
        void noteOff(int voiceIndex) noexcept override;
        
        void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept override { 
            ampEnv = 0.0f; filterEnv = 0.0f; 
        }

        void pushConfigUpdate() noexcept { mPendingConfigUpdate.store(true); }
        void setVoicePlan(const ::Omega::Core::Voice::CompiledVoicePlan& plan) noexcept {
            mNextVoicePlan = plan;
            mPendingPlanUpdate.store(true);
        }

        /**
         * [P0-2] Convierte un NoteOn/NoteOff publicado por un módulo (vía
         * omega_publish_midi) en una activación de voz del engine. Se registra
         * en WasmModuleService::setVoiceTriggerCallback durante prepare().
         * Frecuencia derivada del número de nota MIDI (A4 = 69 = 440 Hz).
         */
        void onModuleMidi(int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2) noexcept;

        void setConfigProvider(std::atomic<::Omega::Core::Model::RuntimeSnapshot*>* provider) noexcept { 
            mConfigProvider = provider; 
        }

    private:
        void applyConfigUpdate() noexcept;

        double mSampleRate = 44100.0;
        int mBlockSize = 256;
        ::Omega::Engine::Modulation::ModulationRuntime mModRuntime;
        
        // [P0-1] Techo de voces ligado a la constante canónica del settings
        // (kMaxVoices). Antes: literales 16 sueltos inconsistentes con el
        // setting "numVoices" (YAML max 16, fallback legacy max 32).
        // NOTA: es un alias estricto de SystemSettingsManager::kMaxVoices — si
        // alguna vez el engine necesitara otro techo, cambiarlo AQUÍ y en el
        // clamp de getNumVoices() para que sigan en sync (un solo valor canónico).
        static constexpr int kVoiceCount = ::Omega::Core::Service::SystemSettingsManager::kMaxVoices;

        /** [P0-2] Longitud del buffer MIDI por voz (mismo límite que VoiceState::modularMidi). */
        static constexpr int kModularMidiBufferSize = 16;
        std::array<int, kVoiceCount> mVoiceNoteIds { -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1 };
        std::array<float, 64> mChannelModStates;
        std::array<Omega::Engine::Modular::OmegaAsepticVoice, kVoiceCount> mVoices;
        
        ::Omega::Core::Voice::CompiledVoicePlan mVoicePlan;
        ::Omega::Core::Voice::CompiledVoicePlan mNextVoicePlan;
        std::array<::Omega::Core::Voice::VoiceState, kVoiceCount> mVoiceStates;
        std::atomic<bool> mPendingPlanUpdate { false };
        
        ::Omega::Core::Service::SystemSettingsManager& mSettings;
        int mNumVoices = kVoiceCount;
        std::atomic<bool> mPendingConfigUpdate { false };
        std::atomic<::Omega::Core::Model::RuntimeSnapshot*>* mConfigProvider = nullptr;
        ::Omega::Core::Model::RuntimeSnapshot mCurrentSnapshot;
        ::Omega::Core::Util::PerformanceMonitor mPerfMonitor{"VirtualAnalogEngine"};

        int mSlotMaster = -1;
        int mSlotActivity = -1;
    };

} // namespace Omega::Engine::Modular
