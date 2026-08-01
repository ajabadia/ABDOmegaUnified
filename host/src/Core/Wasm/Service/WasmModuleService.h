#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <functional>
#include <cstdint>
#include "wasm_export.h"

namespace Omega {
namespace Core {
namespace Wasm {

    /**
     * @brief Singleton service for the WAMR (WebAssembly Micro Runtime).
     */
    class WasmModuleService {
    public:
        static WasmModuleService& getInstance();

        /**
         * @brief Loads a .wasm or .aot module from disk.
         */
        bool loadModule(const std::string& manifestId, const std::string& path);

        /**
         * @brief Extrae el contrato JSON de un módulo sin cargarlo permanentemente en el motor.
         */
        std::string getModuleContract(const std::string& path);

        /**
         * @brief Executes the process function of a module instance.
         */
        void process(int voiceIdx, int unitId, float* buffer, int length);

        /**
         * @brief Dispatches a MIDI event to a module instance.
         */
        void dispatchMidi(int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2);

        /**
         * @brief Updates environment metadata for WASM modules.
         */
        void setEnvironment(double sampleRate, int blockSize, int midiProtocol);
        
        /**
         * @brief Binds global system buffers for WASM host imports.
         * Supports multiple external input ports for advanced routing.
         */
        void bindSystemBuffers(float* outL, float* outR, const float** inputs = nullptr, int numInputs = 0) {
            m_mainL = outL;
            m_mainR = outR;
            m_inputs = inputs;
            m_numInputs = numInputs;
        }

        /**
         * @brief Binds a specific voice state for host import mapping.
         */
        void bindVoiceState(int voiceIdx, void* state) {
            if (voiceIdx >= 0 && voiceIdx < 64) m_voiceStates[voiceIdx] = state;
        }

        void* getVoiceState(int voiceIdx) const {
            return (voiceIdx >= 0 && voiceIdx < 64) ? m_voiceStates[voiceIdx] : nullptr;
        }

        int findVoiceIdxByInst(wasm_module_inst_t inst) const {
            for (int i = 0; i < 64; ++i) if (m_instances[i] == inst) return i;
            return -1;
        }

        double getSampleRate() const { return m_sampleRate; }
        int getBlockSize() const { return m_blockSize; }
        int getMidiProtocol() const { return m_midiProtocol; }
        float* getMainL() const { return m_mainL; }
        float* getMainR() const { return m_mainR; }
        const float* getInput(int index) const { 
            return (index >= 0 && index < m_numInputs && m_inputs) ? m_inputs[index] : nullptr; 
        }

        using TerminalLogCallback = std::function<void(const std::string&, const std::string&)>;
        void setTerminalLogCallback(TerminalLogCallback callback) { m_terminalLogCallback = callback; }
        void logTerminal(const std::string& bindId, const std::string& message) {
            if (m_terminalLogCallback) m_terminalLogCallback(bindId, message);
        }

        using MidiPublishCallback = std::function<void(uint32_t, uint8_t, uint8_t, uint8_t)>;
        void setMidiPublishCallback(MidiPublishCallback callback) { m_midiPublishCallback = callback; }
        void publishMidi(uint32_t port, uint8_t status, uint8_t d1, uint8_t d2) {
            if (m_midiPublishCallback) m_midiPublishCallback(port, status, d1, d2);
        }

    private:
        WasmModuleService();
        ~WasmModuleService();

        // Prevent copying
        WasmModuleService(const WasmModuleService&) = delete;
        WasmModuleService& operator=(const WasmModuleService&) = delete;

        TerminalLogCallback m_terminalLogCallback;
        MidiPublishCallback m_midiPublishCallback;
        // WAMR handles
        wasm_module_t m_module = nullptr;
        wasm_module_inst_t m_instances[64]; // 32 voices + 32 global slots
        wasm_exec_env_t m_execEnvs[64];
        void* m_voiceStates[64];

        // Memory limits (VA 2.1.W Config)
        static constexpr uint32_t kStackSize = 128 * 1024; // 128KB as requested
        static constexpr uint32_t kHeapSize = 64 * 1024;

        double m_sampleRate = 44100.0;
        int m_blockSize = 256;
        int m_midiProtocol = 1;

        float* m_mainL = nullptr;
        float* m_mainR = nullptr;
        const float** m_inputs = nullptr;
        int m_numInputs = 0;
    };

} // namespace Wasm
} // namespace Core
} // namespace Omega
