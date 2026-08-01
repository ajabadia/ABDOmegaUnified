#include "ModulationRuntime.h"
#include "WasmModuleService.h"
#include <cmath>

namespace Omega::Engine::Modulation {

    void ModulationRuntime::processBlock(int numSamples) {
        // [Era 7.2] Linear orchestration of the global rack
        for (int i = 0; i < mNumNodes; ++i) {
            processNode(mNodes[i], numSamples);
        }
    }

    void ModulationRuntime::processNode(RuntimeNode& node, int numSamples) {
        // [Aseptic Orchestration]
        // Instead of a switch statement with hardcoded math, 
        // we delegate the processing to a dedicated WASM instance.
        
        // We use voiceIdx 32-63 for global modulation modules
        int globalInstanceIdx = 32 + node.wasmInstanceId;
        
        auto& wasmService = Core::Wasm::WasmModuleService::getInstance();
        
        // The WASM module maps the entire SignalBufferBank as its memory space 
        // or uses host imports to read/write specific signals.
        // We pass the raw data pointer for zero-copy processing.
        wasmService.process(globalInstanceIdx, (int)node.outputIndex, mBuffers.values.data(), numSamples);
    }

} // namespace Omega::Engine::Modulation
