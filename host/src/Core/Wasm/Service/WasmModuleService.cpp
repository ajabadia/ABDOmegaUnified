#include "WasmModuleService.h"
#include <fstream>
#include <iostream>
#include <cstring>

extern "C" void omega_wasm_register_host_symbols();

namespace Omega {
namespace Core {
namespace Wasm {

    WasmModuleService& WasmModuleService::getInstance() {
        static WasmModuleService instance;
        return instance;
    }

    WasmModuleService::WasmModuleService() {
        memset(m_instances, 0, sizeof(m_instances));
        memset(m_execEnvs, 0, sizeof(m_execEnvs));
        memset(m_slotUsed, 0, sizeof(m_slotUsed));
        for (int i = 0; i < kMaxSlots; ++i) m_slotToVoice[i] = -1;
        memset(m_voiceStates, 0, sizeof(m_voiceStates));

        // Initialize WAMR Runtime
        RuntimeInitArgs init_args;
        memset(&init_args, 0, sizeof(RuntimeInitArgs));

        init_args.mem_alloc_type = Alloc_With_System_Allocator;
        
        if (!wasm_runtime_full_init(&init_args)) {
            std::cerr << "[WASM] Failed to initialize WAMR runtime." << std::endl;
        }

        // Register OMEGA Host Symbols (ABI)
        ::omega_wasm_register_host_symbols();
    }

    WasmModuleService::~WasmModuleService() {
        unloadAll();
        wasm_runtime_destroy();
    }

    void WasmModuleService::releaseModule(const std::string& manifestId) {
        auto it = m_modules.find(manifestId);
        if (it == m_modules.end()) return;

        for (int slot : it->second.slots) {
            if (m_instances[slot]) wasm_runtime_deinstantiate(m_instances[slot]);
            if (m_execEnvs[slot]) wasm_runtime_destroy_exec_env(m_execEnvs[slot]);
            m_instances[slot] = nullptr;
            m_execEnvs[slot] = nullptr;
            m_slotUsed[slot] = false;
            m_slotToVoice[slot] = -1;
        }
        if (it->second.module) wasm_runtime_unload(it->second.module);

        // Clear voice->slot associations for this module across all voices
        for (int v = 0; v < 64; ++v) m_voiceSlot[v].erase(manifestId);

        m_modules.erase(it);
    }

    void WasmModuleService::unloadAll() {
        std::vector<std::string> ids;
        ids.reserve(m_modules.size());
        for (const auto& kv : m_modules) ids.push_back(kv.first);
        for (const auto& id : ids) releaseModule(id);
    }

    bool WasmModuleService::loadModule(const std::string& manifestId, const std::string& path) {
        if (manifestId.empty()) return false;

        // Re-loading a manifest replaces its pool
        releaseModule(manifestId);

        std::ifstream file(path, std::ios::binary | std::ios::ate);
        if (!file.is_open()) return false;

        std::streamsize size = file.tellg();
        file.seekg(0, std::ios::beg);

        std::vector<uint8_t> buffer(size);
        if (!file.read((char*)buffer.data(), size)) return false;

        char error_buf[128];
        wasm_module_t module = wasm_runtime_load(buffer.data(), (uint32_t)size, error_buf, sizeof(error_buf));

        if (!module) {
            std::cerr << "[WASM] Load error [" << manifestId << "]: " << error_buf << std::endl;
            return false;
        }

        // Reserve a pool of free slots
        std::vector<int> slots;
        slots.reserve(kInstancesPerModule);
        for (int i = 0; i < kMaxSlots && (int)slots.size() < kInstancesPerModule; ++i) {
            if (!m_slotUsed[i]) slots.push_back(i);
        }

        if ((int)slots.size() < kInstancesPerModule) {
            std::cerr << "[WASM] Slot pool exhausted, cannot host module [" << manifestId << "]" << std::endl;
            wasm_runtime_unload(module);
            return false;
        }

        // Standard Instantiation for the module's pool
        for (int slot : slots) {
            m_instances[slot] = wasm_runtime_instantiate(module, kStackSize, kHeapSize, error_buf, sizeof(error_buf));
            if (!m_instances[slot]) {
                std::cerr << "[WASM] Instantiation error [slot " << slot << "]: " << error_buf << std::endl;
            } else {
                m_execEnvs[slot] = wasm_runtime_create_exec_env(m_instances[slot], kStackSize);
            }
            m_slotUsed[slot] = true;
            m_slotToVoice[slot] = -1;
        }

        ModuleRecord record;
        record.module = module;
        record.slots = slots;
        record.assigned.assign(slots.size(), -1);

        m_modules[manifestId] = std::move(record);
        m_defaultManifestId = manifestId;

        std::cout << "[WASM] Loaded module [" << manifestId << "] with " << slots.size()
                  << " instances (" << path << ")" << std::endl;
        return true;
    }

    int WasmModuleService::acquireSlot(const std::string& manifestId, int voiceIdx) {
        if (voiceIdx < 0 || voiceIdx >= 64) return -1;

        auto it = m_modules.find(manifestId);
        if (it == m_modules.end()) return -1;

        // Reuse the slot already assigned to this voice for this module
        auto vs = m_voiceSlot[voiceIdx].find(manifestId);
        if (vs != m_voiceSlot[voiceIdx].end()) return vs->second;

        // Round-robin assignment across the module's pool
        int slot = -1;
        for (size_t i = 0; i < it->second.slots.size(); ++i) {
            int s = it->second.slots[i];
            if (it->second.assigned[i] < 0) { slot = s; it->second.assigned[i] = voiceIdx; break; }
        }
        if (slot < 0) { // all pool slots busy -> steal from first pool slot
            slot = it->second.slots[0];
            int prev = it->second.assigned[0];
            if (prev >= 0) m_voiceSlot[prev].erase(manifestId);
            it->second.assigned[0] = voiceIdx;
        }

        m_voiceSlot[voiceIdx][manifestId] = slot;
        m_slotToVoice[slot] = voiceIdx;
        return slot;
    }

    std::string WasmModuleService::getModuleContract(const std::string& path) {
        std::ifstream file(path, std::ios::binary | std::ios::ate);
        if (!file.is_open()) return "";

        std::streamsize size = file.tellg();
        file.seekg(0, std::ios::beg);

        std::vector<uint8_t> buffer(size);
        if (!file.read((char*)buffer.data(), size)) return "";

        char error_buf[128];
        wasm_module_t temp_module = wasm_runtime_load(buffer.data(), (uint32_t)size, error_buf, sizeof(error_buf));
        if (!temp_module) return "";

        wasm_module_inst_t inst = wasm_runtime_instantiate(temp_module, kStackSize, kHeapSize, error_buf, sizeof(error_buf));
        if (!inst) {
            wasm_runtime_unload(temp_module);
            return "";
        }

        wasm_exec_env_t execEnv = wasm_runtime_create_exec_env(inst, kStackSize);
        std::string result = "";

        if (execEnv) {
            wasm_function_inst_t func = wasm_runtime_lookup_function(inst, "omega_get_contract", "()i");
            if (func) {
                uint32_t argv[1];
                if (wasm_runtime_call_wasm(execEnv, func, 0, argv)) {
                    uint32_t wasmPtr = argv[0];
                    const char* nativePtr = (const char*)wasm_runtime_addr_app_to_native(inst, wasmPtr);
                    if (nativePtr) result = nativePtr;
                }
            }
            wasm_runtime_destroy_exec_env(execEnv);
        }

        wasm_runtime_deinstantiate(inst);
        wasm_runtime_unload(temp_module);

        return result;
    }

    void WasmModuleService::process(const std::string& manifestId, int voiceIdx, int unitId, float* buffer, int length) {
        int slot = acquireSlot(manifestId, voiceIdx);
        if (slot < 0 || !m_instances[slot]) return;

        wasm_function_inst_t func = wasm_runtime_lookup_function(m_instances[slot], "omega_process", "(*i)f");
        if (!func) return;

        // Zero-Copy Bridge: Map host buffer to guest memory space
        uint32_t argv[2];
        argv[0] = wasm_runtime_addr_native_to_app(m_instances[slot], buffer);
        argv[1] = (uint32_t)length;

        if (!wasm_runtime_call_wasm(m_execEnvs[slot], func, 2, argv)) {
            const char* exception = wasm_runtime_get_exception(m_instances[slot]);
            if (exception) std::cerr << "[WASM] Runtime Exception: " << exception << std::endl;
        }
    }

    void WasmModuleService::process(int voiceIdx, int unitId, float* buffer, int length) {
        // Legacy single-module path (global modulation rack nodes).
        // Resolves the instance from the most recently loaded module.
        if (m_defaultManifestId.empty()) return;
        process(m_defaultManifestId, voiceIdx, unitId, buffer, length);
    }

    void WasmModuleService::dispatchMidi(int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2) {
        if (m_defaultManifestId.empty()) return;
        dispatchMidi(m_defaultManifestId, voiceIdx, status, d1, d2);
    }

    void WasmModuleService::dispatchMidi(const std::string& manifestId, int voiceIdx,
                                         uint8_t status, uint8_t d1, uint8_t d2) {
        int slot = acquireSlot(manifestId, voiceIdx);
        if (slot < 0 || !m_instances[slot]) return;

        wasm_function_inst_t func = wasm_runtime_lookup_function(m_instances[slot], "omega_on_midi", "(iii)");
        if (!func) return;

        uint32_t argv[3];
        argv[0] = (uint32_t)status;
        argv[1] = (uint32_t)d1;
        argv[2] = (uint32_t)d2;

        if (!wasm_runtime_call_wasm(m_execEnvs[slot], func, 3, argv)) {
            const char* exception = wasm_runtime_get_exception(m_instances[slot]);
            if (exception) std::cerr << "[WASM] MIDI Dispatch Exception: " << exception << std::endl;
        }
    }

    void WasmModuleService::setEnvironment(double sampleRate, int blockSize, int midiProtocol) {
        m_sampleRate = sampleRate;
        m_blockSize = blockSize;
        m_midiProtocol = midiProtocol;
    }

} // namespace Wasm
} // namespace Core
} // namespace Omega
