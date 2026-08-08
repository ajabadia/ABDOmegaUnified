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
     *
     * [Era 8.1] Multi-module: each manifestId keeps its own WAMR module and a
     * pool of `kInstancesPerModule` instances. The pool is assigned to voices
     * on demand (round-robin), so a CompiledVoicePlan containing several
     * generator/processor units (osc + filter + env) executes each module's
     * own .wasm instead of re-running a single shared module.
     */
    class WasmModuleService {
    public:
        static WasmModuleService& getInstance();

        static constexpr int kMaxSlots = 64;
        static constexpr int kInstancesPerModule = 16;

        /**
         * @brief Loads a .wasm or .aot module from disk and instantiates a
         * pool of instances. Re-loading the same manifestId replaces it.
         */
        bool loadModule(const std::string& manifestId, const std::string& path);

        /**
         * @brief Extrae el contrato JSON de un módulo sin cargarlo permanentemente en el motor.
         */
        std::string getModuleContract(const std::string& path);

        /**
         * @brief Executes the process function of a module instance.
         * Instance is resolved by (manifestId, voiceIdx) with round-robin
         * assignment across the module's pool.
         */
        void process(const std::string& manifestId, int voiceIdx, int unitId, float* buffer, int length);

        /**
         * @brief Legacy single-module process (used by the global modulation rack).
         * Resolves the instance from the last loaded module.
         */
        void process(int voiceIdx, int unitId, float* buffer, int length);

        /**
         * @brief Dispatches a MIDI event to a module instance.
         * [P0-2] Single-module legacy path (last loaded module).
         */
        void dispatchMidi(int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2);

        /**
         * @brief Dispatches a MIDI event to the instance of a SPECIFIC module
         * (manifestId) bound to a voice. [P0-2] Usado por el puente modular:
         * el sistema inyecta al módulo midi_in y el render despacha el bus MIDI
         * de la voz a los midiTargets del plan.
         */
        void dispatchMidi(const std::string& manifestId, int voiceIdx,
                          uint8_t status, uint8_t d1, uint8_t d2);

        /**
         * [P0-2] Callback de disparo de voz: cuando un módulo publica MIDI
         * (omega_publish_midi) y el mensaje es NoteOn/NoteOff, el host activa la
         * voz del engine correspondiente. Registrado por VirtualAnalogEngine en
         * prepare(). El flujo modular completo queda: sistema → midi_in.omega_on_midi
         * → omega_publish_midi → (callback) engine.noteOn + bus modularMidi.
         */
        using VoiceTriggerCallback = std::function<void(int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2)>;
        void setVoiceTriggerCallback(VoiceTriggerCallback cb) { m_voiceTriggerCallback = std::move(cb); }
        void triggerVoice(int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2) {
            if (m_voiceTriggerCallback) m_voiceTriggerCallback(voiceIdx, status, d1, d2);
        }

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

        /**
         * @brief Maps a WAMR instance back to the voice that currently owns it.
         */
        int findVoiceIdxByInst(wasm_module_inst_t inst) const {
            for (int i = 0; i < kMaxSlots; ++i) if (m_instances[i] == inst) return m_slotToVoice[i];
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

        /**
         * @brief True when a module for manifestId has been loaded and has free
         * pool capacity to serve a new voice.
         */
        bool hasModule(const std::string& manifestId) const { return m_modules.count(manifestId) != 0; }

    private:
        WasmModuleService();
        ~WasmModuleService();

        // Prevent copying
        WasmModuleService(const WasmModuleService&) = delete;
        WasmModuleService& operator=(const WasmModuleService&) = delete;

        struct ModuleRecord {
            wasm_module_t module = nullptr;
            std::vector<int> slots;   // slot indices in this module's pool
            std::vector<int> assigned; // voiceIdx currently assigned to each slot (index-aligned)
        };

        int acquireSlot(const std::string& manifestId, int voiceIdx);
        void releaseModule(const std::string& manifestId);
        void unloadAll();

        TerminalLogCallback m_terminalLogCallback;
        MidiPublishCallback m_midiPublishCallback;
        VoiceTriggerCallback m_voiceTriggerCallback;

        // WAMR handles
        std::unordered_map<std::string, ModuleRecord> m_modules;
        std::string m_defaultManifestId; // last loaded module (legacy fallback)

        wasm_module_inst_t m_instances[kMaxSlots];
        wasm_exec_env_t m_execEnvs[kMaxSlots];
        bool m_slotUsed[kMaxSlots];
        int m_slotToVoice[kMaxSlots];      // voiceIdx owning this slot, -1 = none
        void* m_voiceStates[64];
        std::unordered_map<std::string, int> m_voiceSlot[64]; // voiceIdx -> {manifestId -> slot}

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
