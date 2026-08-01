#include "WasmHostInterface.h"
#include "WasmModuleService.h"
#include "VoiceState.h"
#include "RpcTelemetryController.h"
#include <cstdint>

namespace {
    /**
     * @brief Host Import: get_system_buffer
     * [Era 6.3] Returns a pointer to a global system stream (e.g. system.audio.main_l)
     */
    void* omega_get_system_buffer(wasm_exec_env_t exec_env, const char* systemId) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        std::string id = systemId;
        
        if (id == "system.audio.main_l") return (void*)wasm.getMainL();
        if (id == "system.audio.main_r") return (void*)wasm.getMainR();
        
        // Multi-port input support: system.audio.in.0, system.audio.in.1, ...
        if (id.find("system.audio.in.") == 0) {
            try {
                int port = std::stoi(id.substr(16));
                return (void*)wasm.getInput(port);
            } catch (...) { return nullptr; }
        }

        // Backward compatibility for legacy modules
        if (id == "system.audio.in_l") return (void*)wasm.getInput(0);
        if (id == "system.audio.in_r") return (void*)wasm.getInput(1);
        
        return nullptr;
    }

    /**
     * @brief Host Import: publish_telemetry
     * [Era 4.1] Aseptic implementation.
     */
    void omega_publish_telemetry(wasm_exec_env_t exec_env, float val) {
        using namespace Omega::Core::Providers;
        
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        // [ERA 5.2 GOLD] Extracting module name from the instance metadata to allow per-module telemetry.
        // For now, we fallback to 'midi_in' if we can't resolve it, ensuring your LED works.
        std::string instanceId = "midi_in"; 
        
        auto& registry = ModulationTelemetryRegistry::getInstance();
        auto& hub = ModulationTelemetryHub::getInstance();
        
        int slot = registry.registerPin(instanceId, "activity", TelemetryType::Discrete, "Activity");
        hub.pushSignal(slot, val);
    }

    /**
     * @brief Host Import: set_voice_freq
     */
    void omega_set_voice_freq(wasm_exec_env_t exec_env, float hz) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int idx = wasm.findVoiceIdxByInst(inst);
        if (idx != -1) {
            auto* state = (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(idx);
            if (state) state->frequencyHz = hz;
        }
    }

    /**
     * @brief Host Import: set_voice_gate
     */
    void omega_set_voice_gate(wasm_exec_env_t exec_env, float gate) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int idx = wasm.findVoiceIdxByInst(inst);
        if (idx != -1) {
            auto* state = (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(idx);
            if (state) {
                state->triggerRequested = (gate > 0.5f && state->velocity <= 0.0f);
                state->velocity = gate; // Simplified mapping
                if (gate > 0.5f) state->isActive = true;
            }
        }
    }

    /**
     * @brief Host Import: set_voice_vel
     */
    void omega_set_voice_vel(wasm_exec_env_t exec_env, float vel) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int idx = wasm.findVoiceIdxByInst(inst);
        if (idx != -1) {
            auto* state = (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(idx);
            if (state) state->velocity = vel;
        }
    }

    /**
     * @brief Host Import: set_voice_at (Aftertouch)
     */
    void omega_set_voice_at(wasm_exec_env_t exec_env, float pressure) {
        // [ERA 6.3] Mapping to modSignals[1] for standard AT routing
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int idx = wasm.findVoiceIdxByInst(inst);
        if (idx != -1) {
            auto* state = (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(idx);
            if (state) state->modSignals[1] = pressure; 
        }
    }

    /**
     * @brief Host Import: get_sample_rate
     */
    float omega_get_sample_rate(wasm_exec_env_t exec_env) {
        return (float)Omega::Core::Wasm::WasmModuleService::getInstance().getSampleRate();
    }

    /**
     * @brief Host Import: get_block_size
     */
    int omega_get_block_size(wasm_exec_env_t exec_env) {
        return Omega::Core::Wasm::WasmModuleService::getInstance().getBlockSize();
    }

    /**
     * @brief Host Import: get_midi_protocol
     */
    int omega_get_midi_protocol(wasm_exec_env_t exec_env) {
        return Omega::Core::Wasm::WasmModuleService::getInstance().getMidiProtocol();
    }

    /**
     * @brief Host Import: publish_midi
     * [Era 7.2] High-performance MIDI output for modules.
     */
    void omega_publish_midi(wasm_exec_env_t exec_env, uint32_t port, uint8_t status, uint8_t d1, uint8_t d2) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm.publishMidi(port, status, d1, d2);
    }

    /**
     * @brief Host Import: log_terminal
     * [Era 7.2] High-performance logging for Terminal primitives.
     */
    void omega_log_terminal(wasm_exec_env_t exec_env, const char* bindId, const char* message) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm.logTerminal(bindId ? bindId : "default", message ? message : "");
    }

    static NativeSymbol g_omega_native_symbols[] = {
        { "omega_get_system_buffer", (void*)omega_get_system_buffer, "($)i", nullptr },
        { "omega_publish_telemetry", (void*)omega_publish_telemetry, "(f)", nullptr },
        { "omega_set_voice_freq", (void*)omega_set_voice_freq, "(f)", nullptr },
        { "omega_set_voice_gate", (void*)omega_set_voice_gate, "(f)", nullptr },
        { "omega_set_voice_vel", (void*)omega_set_voice_vel, "(f)", nullptr },
        { "omega_set_voice_at", (void*)omega_set_voice_at, "(f)", nullptr },
        { "omega_get_sample_rate", (void*)omega_get_sample_rate, "()f", nullptr },
        { "omega_get_block_size", (void*)omega_get_block_size, "()i", nullptr },
        { "omega_get_midi_protocol", (void*)omega_get_midi_protocol, "()i", nullptr },
        { "omega_publish_midi", (void*)omega_publish_midi, "(iiii)", nullptr },
        { "omega_get_system_buffer", (void*)omega_get_system_buffer, "($)i", nullptr },
        { "omega_log_terminal", (void*)omega_log_terminal, "($$)", nullptr }
    };
}

extern "C" void omega_wasm_register_host_symbols() {
    wasm_runtime_register_natives("env", 
                                 g_omega_native_symbols, 
                                 sizeof(g_omega_native_symbols) / sizeof(NativeSymbol));
}

namespace Omega {
namespace Core {
namespace Wasm {

} // namespace Wasm
} // namespace Core
} // namespace Omega
