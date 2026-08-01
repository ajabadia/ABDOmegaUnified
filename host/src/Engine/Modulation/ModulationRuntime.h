#pragma once

#include "SignalTypes.h"
#include <array>
#include <vector>
#include <atomic>
#include <algorithm>

/** [BUILD_FORCE_72] OMEGA Aseptic Modulation Hub (Era 7.2.3). **/
namespace Omega::Engine::Modulation {

    /**
     * @brief Aseptic Modulation Node.
     * Pure Metadata: Does NOT contain hardcoded DSP algorithms.
     * Maps to a WASM module instance in the Global Rack.
     */
    struct alignas(32) RuntimeNode {
        uint8_t type;            // Legacy type (mapped to wasm instance)
        uint8_t wasmInstanceId;  // WASM Instance Index in the global pool (32-63)
        uint8_t outputIndex;     // Signal index in the buffer bank
        
        // Connections are managed inside the WASM module via the Host API 
        // or by mapping the buffer bank as the guest memory space.
    };

    /**
     * @brief High-density signal store for the current processing block.
     */
    struct SignalBufferBank {
        static constexpr int kMaxSignals = 256;
        std::array<float, kMaxSignals> values; 
    };

    /**
     * @brief OMEGA 7.2 Aseptic Modulation Orchestrator.
     * Pure Container: Executes global LFOs, Envelopes, and Math via WASM.
     */
    class ModulationRuntime {
    public:
        static constexpr int kMaxNodes = 32;

        ModulationRuntime() : mNumNodes(0) {
            std::fill(mNodes.begin(), mNodes.end(), RuntimeNode{});
        }

        void reset() {
            mBuffers.values.fill(0.0f);
        }

        /**
         * @brief Processes the global modulation rack.
         */
        void processBlock(int numSamples);

        void addRuntimeNode(const RuntimeNode& node) {
            if (mNumNodes < kMaxNodes) mNodes[mNumNodes++] = node;
        }

        void setSourceValue(uint8_t index, float value) {
            mBuffers.values[index] = value;
        }

        float getSignalValue(uint8_t index) const { return mBuffers.values[index]; }
        const std::array<float, SignalBufferBank::kMaxSignals>& getBuffers() const { return mBuffers.values; }

    private:
        void processNode(RuntimeNode& node, int numSamples);

        std::array<RuntimeNode, kMaxNodes> mNodes;
        int mNumNodes;
        SignalBufferBank mBuffers;
    };

} // namespace Omega::Engine::Modulation
