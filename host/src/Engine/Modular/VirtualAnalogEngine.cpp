#include "VirtualAnalogEngine.h"
#include "WasmModuleService.h"
#include <cmath>

namespace Omega::Engine::Modular {
 
    VirtualAnalogEngine::VirtualAnalogEngine(::Omega::Core::Service::SystemSettingsManager& settings)
        : mSettings(settings)
    {
    }


    void VirtualAnalogEngine::prepare(double sampleRate, int samplesPerBlock) {
        mSampleRate = sampleRate;
        
        auto& reg = Core::Providers::ModulationTelemetryRegistry::getInstance();
        mSlotMaster = reg.registerPin("engine", "master_out", Core::Providers::TelemetryType::Audio, "Final Out");
        mSlotActivity = reg.registerPin("engine", "activity", Core::Providers::TelemetryType::Discrete, "Signal Activity");

        for (auto& v : mVoices) v.prepare(sampleRate, samplesPerBlock);
        mBlockSize = samplesPerBlock;
        mModRuntime.reset();
        
        mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kSystemSampleRate, (float)mSampleRate);
        mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kSystemBlockSize, (float)mBlockSize);

        ::Omega::Core::Wasm::WasmModuleService::getInstance().setEnvironment(mSampleRate, mBlockSize, 1);
    }

    void VirtualAnalogEngine::reset() {
        mModRuntime.reset();
        for (auto& v : mVoices) v.reset();
        for (auto& s : mVoiceStates) {
            for (auto& b : s.buses) b = 0.0f;
            s.isActive = false;
        }
    }

    void VirtualAnalogEngine::renderNextBlock(::juce::AudioBuffer<float>& buffer) noexcept {
        if (mPendingConfigUpdate.load()) { applyConfigUpdate(); mPendingConfigUpdate.store(false); }
        mNumVoices = mSettings.getNumVoices();
        
        const int numSamples = buffer.getNumSamples();
        const int numChannels = buffer.getNumChannels();
        auto& hub = ::Omega::Core::Providers::ModulationTelemetryHub::getInstance();
        
        for (int s = 0; s < numSamples; ++s) {
            mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kSystemSampleRate, (float)mSampleRate);
            mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kSystemBlockSize, (float)mBlockSize);

            mModRuntime.processBlock(1);
            float mixedL = 0.0f, mixedR = 0.0f;
            
            // Prepare multi-port inputs (up to 8 channels)
            const float* inputs[8];
            int activeInputs = std::min(numChannels, 8);
            for (int i = 0; i < activeInputs; ++i) {
                inputs[i] = buffer.getReadPointer(i) + s;
            }

            ::Omega::Core::Wasm::WasmModuleService::getInstance().bindSystemBuffers(&mixedL, &mixedR, inputs, activeInputs);
            
            for (int v = 0; v < mNumVoices; ++v) {
                if (mVoices[v].isActive()) {
                    float vL = 0.0f, vR = 0.0f;
                    if (mVoicePlan.isInitialised) {
                        ::Omega::Core::Voice::VoiceState& state = mVoiceStates[v];
                        state.isActive = mVoices[v].isActive();
                        ::Omega::Core::Wasm::WasmModuleService::getInstance().bindVoiceState(v, &state);

                        // [Era 7.2] Modular rendering is now purely voice-state driven.
                        mVoices[v].renderSample(vL, vR, v, state);
                        
                        state.triggerRequested = false; 
                        mixedL += vL; mixedR += vR; 
                    }
                }
            }
            
            float masterGain = std::pow(10.0f, mCurrentSnapshot.globalParams[0] / 20.0f);
            mixedL *= masterGain; mixedR *= masterGain;

            if (s % 32 == 0) {
                hub.pushSignal(mSlotMaster, mixedL); 
                hub.pushSignal(mSlotActivity, mVoiceStates[0].isActive ? 1.0f : 0.0f);
            }

            for (int c = 0; c < numChannels; ++c) buffer.setSample(c, s, (c == 0) ? mixedL : mixedR);
        }

        for (int i = 0; i < 32; ++i) {
            hub.pushSignal(i, mModRuntime.getSignalValue(i));
        }
    }

    void VirtualAnalogEngine::noteOn(int voiceIndex, float freqHz) noexcept { 
        int vIdx = voiceIndex % 16;
        mVoices[vIdx].handleNoteOn((float)voiceIndex, freqHz, 0.8f); 
        mVoiceStates[vIdx].triggerRequested = true;
    }
    
    void VirtualAnalogEngine::noteOff(int voiceIndex) noexcept { 
        int vIdx = voiceIndex % 16;
        mVoices[vIdx].noteOff(); 
    }

    void VirtualAnalogEngine::applyConfigUpdate() noexcept {
        if (!mConfigProvider) return;
        auto* snapshot = mConfigProvider->load();
        if (!snapshot || !snapshot->isValid) return;

        mCurrentSnapshot = *snapshot;
        mVoicePlan = mCurrentSnapshot.voicePlan;
    }

} // namespace Omega::Engine::Modular
