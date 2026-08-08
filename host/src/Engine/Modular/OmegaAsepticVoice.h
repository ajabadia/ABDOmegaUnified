#pragma once

#include <cmath>
#include <algorithm>
#include <array>

/** [BUILD_FORCE_72] OMEGA Industrial Voice Orchestrator (Era 7.2.3). **/
#include "CompiledVoicePlan.h"
#include "VoiceState.h"
#include "WasmModuleService.h"

namespace Omega::Engine::Modular {

    /**
     * @brief OMEGA 7.2 Aseptic Voice Orchestrator.
     * Pure Container: Executes the CompiledVoicePlan via WASM modules.
     * [Era 8.1] Each unit is dispatched to its own WASM module (moduleId);
     * per-voice gate/release is handled here so modules can read it via
     * the system.voice.gate stream.
     */
    class OmegaAsepticVoice {
    public:
        OmegaAsepticVoice() = default;

        void prepare(double sampleRate, int samplesPerBlock) {
            mSampleRate = sampleRate;
        }

        void reset() { 
            mIsActive = false; 
            mGate = false;
            mReleaseRemaining = 0;
        }
        
        void handleNoteOn(float noteNumber, float frequencyHz, float velocity) {
            mBaseFrequency = frequencyHz; 
            mVelocity = velocity;
            mGate = true;
            mReleaseRemaining = 0;
            mIsActive = true;
        }

        void noteOff() { 
            // Begin release: keep the voice alive for a short tail so the
            // module's envelope can fade instead of clicking to silence.
            mGate = false;
            if (mIsActive) mReleaseRemaining = (int)(0.4 * mSampleRate);
        }

        bool isActive() const { return mIsActive; }
        bool isGateOpen() const { return mGate; }

        /**
         * @brief Renders a single sample by executing the WASM module chain defined in the plan.
         * [Orchestration]: Linear execution of the pre-sorted graph.
         * Convention: Bus 0 = L, Bus 1 = R (voice out); Bus 2/3 = aux outputs.
         */
        void renderSample(float& outL, float& outR, float& auxL, float& auxR,
                          int voiceIdx, ::Omega::Core::Voice::VoiceState& state) 
        {
            outL = outR = 0.0f;
            auxL = auxR = 0.0f;

            if (!mIsActive || state.plan == nullptr || !state.plan->isInitialised) { 
                return; 
            }

            const auto& plan = *(state.plan);
            auto& wasmService = Core::Wasm::WasmModuleService::getInstance();

            // 1. Clear voice buses (Absolute Aseptic Reset)
            for (int i = 0; i < 16; ++i) state.buses[i] = 0.0f;

            // 2. Sequential Unit Execution (graph pre-sorted by dependency)
            for (int i = 0; i < plan.unitCount; ++i) {
                uint8_t unitIdx = plan.executionOrder[i];
                const auto& unit = plan.units[unitIdx];
                if (unit.moduleId.empty()) continue;

                // Invoke the unit's own WASM module. The module reads/writes
                // the state.buses array provided.
                wasmService.process(unit.moduleId, voiceIdx, (int)unitIdx, state.buses, 1);
            }

            // 3. Final Output Extraction
            // [Aseptic Standard]: Bus 0 = Left, Bus 1 = Right
            outL = state.buses[0];
            outR = state.buses[1];
            auxL = state.buses[2];
            auxR = state.buses[3];

            // 4. Voice life-cycle: gate-based release
            if (!mGate) {
                if (mReleaseRemaining > 0) {
                    --mReleaseRemaining;
                } else {
                    mIsActive = false;
                }
            }
        }

    private:
        double mSampleRate = 44100.0;
        bool mIsActive = false;
        bool mGate = false;
        int mReleaseRemaining = 0;
        float mBaseFrequency = 440.0f;
        float mVelocity = 1.0f;
    };

} // namespace Omega::Engine::Modular
