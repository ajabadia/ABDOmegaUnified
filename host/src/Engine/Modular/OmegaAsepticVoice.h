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
     */
    class OmegaAsepticVoice {
    public:
        OmegaAsepticVoice() = default;

        void prepare(double sampleRate, int samplesPerBlock) {
            mSampleRate = sampleRate;
        }

        void reset() { 
            mIsActive = false; 
        }
        
        void handleNoteOn(float noteNumber, float frequencyHz, float velocity) {
            mBaseFrequency = frequencyHz; 
            mVelocity = velocity;
            mIsActive = true;
        }

        void noteOff() { 
            // Signal note-off: Modules will transition to Release stage
        }

        bool isActive() const { return mIsActive; }
        
        /**
         * @brief Renders a single sample by executing the WASM module chain defined in the plan.
         * [Orchestration]: Linear execution of the pre-sorted graph.
         */
        void renderSample(float& outL, float& outR, int voiceIdx, ::Omega::Core::Voice::VoiceState& state) 
        {
            if (!mIsActive || state.plan == nullptr || !state.plan->isInitialised) { 
                outL = outR = 0.0f; 
                return; 
            }

            const auto& plan = *(state.plan);
            auto& wasmService = Core::Wasm::WasmModuleService::getInstance();

            // 1. Clear voice buses (Absolute Aseptic Reset)
            // Convention: Buses are used for inter-module signal routing
            for (int i = 0; i < 16; ++i) state.buses[i] = 0.0f;

            // 2. Sequential Unit Execution
            // The graph is already sorted by dependency (topology) in the plan.
            for (int i = 0; i < plan.unitCount; ++i) {
                uint8_t unitIdx = plan.executionOrder[i];
                
                // Invoke WASM primitive
                // The module reads/writes to the state.buses array provided
                wasmService.process(voiceIdx, (int)unitIdx, state.buses, 1);
            }

            // 3. Final Output Extraction
            // [Aseptic Standard]: Bus 0 = Left, Bus 1 = Right
            outL = state.buses[0];
            outR = state.buses[1];
        }

    private:
        double mSampleRate = 44100.0;
        bool mIsActive = false;
        float mBaseFrequency = 440.0f;
        float mVelocity = 1.0f;
    };

} // namespace Omega::Engine::Modular
