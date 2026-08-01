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

        void setConfigProvider(std::atomic<::Omega::Core::Model::RuntimeSnapshot*>* provider) noexcept { 
            mConfigProvider = provider; 
        }

    private:
        void applyConfigUpdate() noexcept;

        double mSampleRate = 44100.0;
        int mBlockSize = 256;
        ::Omega::Engine::Modulation::ModulationRuntime mModRuntime;
        
        std::array<int, 16> mVoiceNoteIds { -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1 };
        std::array<float, 64> mChannelModStates;
        std::array<Omega::Engine::Modular::OmegaAsepticVoice, 16> mVoices;
        
        ::Omega::Core::Voice::CompiledVoicePlan mVoicePlan;
        ::Omega::Core::Voice::CompiledVoicePlan mNextVoicePlan;
        std::array<::Omega::Core::Voice::VoiceState, 16> mVoiceStates;
        std::atomic<bool> mPendingPlanUpdate { false };
        
        ::Omega::Core::Service::SystemSettingsManager& mSettings;
        int mNumVoices = 16;
        std::atomic<bool> mPendingConfigUpdate { false };
        std::atomic<::Omega::Core::Model::RuntimeSnapshot*>* mConfigProvider = nullptr;
        ::Omega::Core::Model::RuntimeSnapshot mCurrentSnapshot;
        ::Omega::Core::Util::PerformanceMonitor mPerfMonitor{"VirtualAnalogEngine"};

        int mSlotMaster = -1;
        int mSlotActivity = -1;
    };

} // namespace Omega::Engine::Modular
