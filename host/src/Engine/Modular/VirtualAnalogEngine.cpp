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

        auto& wasm = ::Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm.setEnvironment(mSampleRate, mBlockSize, 1);

        // [P0-2] El flujo modular cierra aquí: cuando un módulo publica MIDI
        // (midi_in reenviando el sistema, midi_trigger generando), el host
        // import omega_publish_midi dispara esta callback para activar la voz.
        wasm.setVoiceTriggerCallback([this](int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2) noexcept {
            onModuleMidi(voiceIdx, status, d1, d2);
        });
    }

    void VirtualAnalogEngine::onModuleMidi(int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2) noexcept {
        const uint8_t type = status & 0xF0;
        if (type == 0x90 && d2 > 0) { // Note On
            // Frecuencia del número de nota MIDI (A4 = 69 = 440 Hz)
            const float freq = 440.0f * std::pow(2.0f, ((int)d1 - 69) / 12.0f);
            noteOn(voiceIdx, freq);
        } else if (type == 0x80 || (type == 0x90 && d2 == 0)) { // Note Off
            noteOff(voiceIdx);
        }
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
            float mixedL = 0.0f, mixedR = 0.0f, mixedAuxL = 0.0f, mixedAuxR = 0.0f;
            
            // Prepare multi-port inputs (up to 8 channels)
            const float* inputs[8];
            int activeInputs = std::min(numChannels, 8);
            for (int i = 0; i < activeInputs; ++i) {
                inputs[i] = buffer.getReadPointer(i) + s;
            }

            ::Omega::Core::Wasm::WasmModuleService::getInstance().bindSystemBuffers(&mixedL, &mixedR, inputs, activeInputs);
            
            for (int v = 0; v < mNumVoices; ++v) {
                // [P0-2] El bus MIDI modular se despacha a los midiTargets SIEMPRE
                // que tenga mensajes, independientemente de si la voz está activa:
                // un CC (o cualquier evento no-note) puede llegar a una voz aún
                // inactiva (p. ej. midi_in reenviando antes del primer NoteOn) —
                // si el despacho dependiera de isActive(), el mensaje quedaría
                // atrapado y el bus acumularía hasta el cap de 16 (bloqueando
                // mensajes nuevos). Los targets (p. ej. omega_lab_monitor) no
                // requieren que la voz suene para consumir eventos.
                ::Omega::Core::Voice::VoiceState& state = mVoiceStates[v];
                if (state.modularMidi.count > 0 && mVoicePlan.isInitialised && mVoicePlan.midiTargetCount > 0) {
                    auto& wasmSvc = ::Omega::Core::Wasm::WasmModuleService::getInstance();
                    // Capturar el count ANTES del despacho: si un target publica
                    // MIDI durante dispatchMidi (appendea al MISMO bus), el loop
                    // no debe recoger su propio eco (amplificación en cadena).
                    const int msgCount = state.modularMidi.count;
                    for (int t = 0; t < mVoicePlan.midiTargetCount; ++t) {
                        const uint8_t unitIdx = mVoicePlan.midiTargets[t];
                        if (unitIdx >= mVoicePlan.unitCount) continue;
                        const auto& unit = mVoicePlan.units[unitIdx];
                        if (unit.moduleId.empty()) continue;
                        for (int m = 0; m < msgCount; ++m) {
                            const auto& msg = state.modularMidi.messages[m];
                            wasmSvc.dispatchMidi(unit.moduleId, v, msg.status, msg.d1, msg.d2);
                        }
                    }
                    state.modularMidi.count = 0;
                }
            }

            for (int v = 0; v < mNumVoices; ++v) {
                if (mVoices[v].isActive()) {
                    float vL = 0.0f, vR = 0.0f, vAuxL = 0.0f, vAuxR = 0.0f;
                    if (mVoicePlan.isInitialised) {
                        ::Omega::Core::Voice::VoiceState& state = mVoiceStates[v];
                        state.isActive = mVoices[v].isActive();
                        state.gate = mVoices[v].isGateOpen() ? 1.0f : 0.0f;
                        state.plan = &mVoicePlan;
                        auto& wasmSvc = ::Omega::Core::Wasm::WasmModuleService::getInstance();
                        wasmSvc.bindVoiceState(v, &state);

                        // [Era 7.2] Modular rendering is now purely voice-state driven.
                        mVoices[v].renderSample(vL, vR, vAuxL, vAuxR, v, state);

                        state.triggerRequested = false; 
                        mixedL += vL; mixedR += vR; 
                        mixedAuxL += vAuxL; mixedAuxR += vAuxR; 
                    }
                }
            }
            
            float masterGain = std::pow(10.0f, mCurrentSnapshot.globalParams[0] / 20.0f);
            mixedL *= masterGain; mixedR *= masterGain;
            mixedAuxL *= masterGain; mixedAuxR *= masterGain;

            if (s % 32 == 0) {
                hub.pushSignal(mSlotMaster, mixedL); 
                hub.pushSignal(mSlotActivity, mVoiceStates[0].isActive ? 1.0f : 0.0f);
            }

            for (int c = 0; c < numChannels; ++c) {
                float val = (c == 0) ? mixedL
                         : (c == 1) ? mixedR
                         : (c == 2) ? mixedAuxL
                         : (c == 3) ? mixedAuxR
                         : mixedL;
                buffer.setSample(c, s, val);
            }
        }

        for (int i = 0; i < 32; ++i) {
            hub.pushSignal(i, mModRuntime.getSignalValue(i));
        }
    }

    void VirtualAnalogEngine::noteOn(int voiceIndex, float freqHz) noexcept { 
        // [P0-1] Clamp al techo canónico (kVoiceCount == kMaxVoices). El caller
        // ya pasa un índice < getNumVoices() (clampeado), pero el % defiende
        // contra callers legacy que usen literales sueltos.
        const int vIdx = voiceIndex % kVoiceCount;
        mVoices[vIdx].handleNoteOn((float)voiceIndex, freqHz, 0.8f); 
        mVoiceStates[vIdx].frequencyHz = freqHz;
        mVoiceStates[vIdx].velocity = 0.8f;
        mVoiceStates[vIdx].triggerRequested = true;
    }
    
    void VirtualAnalogEngine::noteOff(int voiceIndex) noexcept { 
        const int vIdx = voiceIndex % kVoiceCount;
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
