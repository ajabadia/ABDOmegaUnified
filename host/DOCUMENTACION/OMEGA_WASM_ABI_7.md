# OMEGA WASM ABI Specification (Era 7.0 - Industrial)

This document defines the standard for OMEGA WebAssembly modules in the Era 7 architecture.

## 1. Primary Standard: C++ (Recommended)
Starting with Era 7, **C++** is the recommended language for OMEGA plugins to leverage the full power of the Self-Describing Contract system and object-oriented DSP.

- **Stack Size**: 128 KB
- **Heap Size**: 64 KB
- **Memory Safety**: Use static buffers for contract exports.

## 2. Required Exports (The Handshake)

### 2.1 `omega_get_contract` [NEW]
The binary is the **Source of Truth**. This function must return a JSON string describing the module.
```cpp
extern "C" EMSCRIPTEN_KEEPALIVE const char* omega_get_contract();
```
*Note: Use the OMEGA_PARAM macros from `OmegaContract.h` to implement this safely.*

### 2.2 `omega_init`
Called once when the module is instantiated.
```cpp
extern "C" void omega_init(float sampleRate);
```

### 2.3 `omega_process`
The main audio rendering hook.
```cpp
extern "C" void omega_process(float* buffer, int length);
```

### 2.4 `omega_on_param`
Handles parameter updates from the host.
```cpp
extern "C" void omega_on_param(int paramId, float value);
```

### 2.5 `omega_on_midi`
Handles incoming MIDI data.
```cpp
extern "C" void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2);
```

## 3. Host Imports (Namespace: "env")
Modules can import these functions to interact with the OMEGA Core.

- `omega_publish_telemetry(float)`: Send data to the UI pins.
- `omega_set_voice_freq(float)`: Update oscillator frequency.
- `omega_set_voice_gate(float)`: Control the ADSR gate.
- `omega_set_voice_vel(float)`: Update voice velocity.
- `omega_set_voice_at(float)`: Update aftertouch/pressure.

## 4. Why the change?
The transition from Era 6 to Era 7 focuses on **Industrial Reliability**. By making the binary self-describing, we eliminate the need for external manifest synchronization and enable a seamless web-based development workflow.

---
*Standard: OMEGA-ABI-7.0-INDUSTRIAL*
