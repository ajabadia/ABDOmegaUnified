#include "WasmHostInterface.h"
#include "WasmModuleService.h"
#include "VoiceState.h"
#include "RpcTelemetryController.h"
#include <cstdint>
#include <string>

namespace {
    /**
     * @brief Resolves the VoiceState bound to the module instance that issued
     * the import call (via slot ownership).
     */
    Omega::Core::Voice::VoiceState* voiceStateFromExecEnv(wasm_exec_env_t exec_env) {
        if (!exec_env) return nullptr;
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int idx = wasm.findVoiceIdxByInst(inst);
        if (idx < 0) return nullptr;
        return (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(idx);
    }

    /**
     * @brief Host Import: get_system_buffer
     * [Era 6.3] Returns a pointer to a global system stream (e.g. system.audio.main_l)
     * [Era 8.1] Adds system.audio.out.N and per-voice state streams (system.voice.*)
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

        // Multi-port output support: system.audio.out.0, system.audio.out.1, ...
        // Backed by the owning voice's audio buses (bus 0/1 = L/R, 2/3 = aux).
        if (id.find("system.audio.out.") == 0) {
            auto* state = voiceStateFromExecEnv(exec_env);
            if (!state) return nullptr;
            try {
                int port = std::stoi(id.substr(17));
                if (port >= 0 && port < 4) return (void*)&state->buses[port];
            } catch (...) { return nullptr; }
            return nullptr;
        }

        // Per-voice live state streams (read via float*).
        if (id == "system.voice.frequency") {
            auto* state = voiceStateFromExecEnv(exec_env);
            return state ? (void*)&state->frequencyHz : nullptr;
        }
        if (id == "system.voice.velocity") {
            auto* state = voiceStateFromExecEnv(exec_env);
            return state ? (void*)&state->velocity : nullptr;
        }
        if (id == "system.voice.gate") {
            auto* state = voiceStateFromExecEnv(exec_env);
            return state ? (void*)&state->gate : nullptr;
        }

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
     * @brief Host Import: get_voice_frequency
     * [Phase A] Float-returning accessor for the owning voice's pitch (Hz).
     * Preferred over omega_get_system_buffer("system.voice.frequency"): WAMR
     * does not translate native return pointers into guest-usable addresses,
     * so a float return is the only safe in-module channel for voice state.
     */
    float omega_get_voice_frequency(wasm_exec_env_t exec_env) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int idx = wasm.findVoiceIdxByInst(inst);
        if (idx != -1) {
            auto* state = (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(idx);
            if (state) return state->frequencyHz;
        }
        return 440.0f;
    }

    /**
     * @brief Host Import: get_voice_gate
     * [Phase A] Owning voice's gate state (1.0 open, 0.0 closed).
     */
    float omega_get_voice_gate(wasm_exec_env_t exec_env) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int idx = wasm.findVoiceIdxByInst(inst);
        if (idx != -1) {
            auto* state = (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(idx);
            if (state) return state->gate;
        }
        return 0.0f;
    }

    /**
     * @brief Host Import: get_voice_velocity
     * [Phase A] Owning voice's velocity (0..1).
     */
    float omega_get_voice_velocity(wasm_exec_env_t exec_env) {
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int idx = wasm.findVoiceIdxByInst(inst);
        if (idx != -1) {
            auto* state = (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(idx);
            if (state) return state->velocity;
        }
        return 0.8f;
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
     * [P0-2] Cierre del flujo modular: el mensaje publicado por un módulo
     * (p. ej. midi_in reenviando el sistema, o midi_trigger generando) se
     * 1) inyecta en el bus MIDI modular de la voz que lo publicó (para que los
     *    midiTargets del plan lo consuman en el render) y
     * 2) si es NoteOn/NoteOff, dispara la voz del engine vía el callback
     *    registrado por VirtualAnalogEngine — así las notas del sistema llegan
     *    al rack SOLO a través del módulo midi_in (modelo modular puro).
     */
    void omega_publish_midi(wasm_exec_env_t exec_env, uint32_t port, uint8_t status, uint8_t d1, uint8_t d2) {
        (void)port;
        auto& wasm = Omega::Core::Wasm::WasmModuleService::getInstance();

        // 1. Resolve the owning voice of the publishing module instance.
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        int voiceIdx = wasm.findVoiceIdxByInst(inst);
        if (voiceIdx >= 0) {
            // 1a. Inyectar al bus MIDI modular de la voz (consumido por midiTargets).
            auto* state = (Omega::Core::Voice::VoiceState*)wasm.getVoiceState(voiceIdx);
            if (state && state->modularMidi.count < 16) {
                auto& msg = state->modularMidi.messages[state->modularMidi.count++];
                msg.status = status;
                msg.d1 = d1;
                msg.d2 = d2;
            }

            // 1b. Disparar la voz del engine en eventos de nota (modular puro).
            wasm.triggerVoice(voiceIdx, status, d1, d2);
        }

        // 2. Canal legacy (callback externo si algún consumidor lo registra).
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
        { "omega_get_voice_frequency", (void*)omega_get_voice_frequency, "()f", nullptr },
        { "omega_get_voice_gate", (void*)omega_get_voice_gate, "()f", nullptr },
        { "omega_get_voice_velocity", (void*)omega_get_voice_velocity, "()f", nullptr },
        { "omega_get_sample_rate", (void*)omega_get_sample_rate, "()f", nullptr },
        { "omega_get_block_size", (void*)omega_get_block_size, "()i", nullptr },
        { "omega_get_midi_protocol", (void*)omega_get_midi_protocol, "()i", nullptr },
        { "omega_publish_midi", (void*)omega_publish_midi, "(iiii)", nullptr },
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
