# 🛡️ OMEGA - Audio Thread Rules

> **Goal:** Ensure 100% glitch-free audio performance and thread safety in the real-time processing loop.

## 🚫 The "Golden No" (Never in the Audio Thread)

| Action | Rationale | Alternatives |
| :--- | :--- | :--- |
| **No Heap Allocation** | `new`/`malloc` can block or trigger GC. | Pre-allocate in `prepareToPlay`, use Pools. |
| **No Mutex/Locks** | Mutexes cause priority inversion/stalls. | `std::atomic`, SPSC Lock-free queues. |
| **No I/O Operations** | Disk/Network access is non-deterministic. | Offload to background threads. |
| **No Logging/Printf** | Printing can allocate memory or lock. | Ring buffers, deferred logging. |
| **No Virtual Calls** | Inner-loop VTable indirection is slow. | CRTP, Templates, Function Pointers. |
| **No Exceptions** | Unwinding is slow and non-deterministic. | Use `noexcept`, return codes. |

## 🟢 Best Practices

### 1. Parameter Access
- **YES:** Cache `std::atomic<float>*` pointers in the constructor or `prepare`.
- **YES:** Use `std::memory_order_relaxed` for most parameter reads in the sample loop.
- **NO:** Access `apvts` directly by string ID during `processBlock`.

### 2. Lock-Free Communication
- Use **SPSC (Single-Producer Single-Consumer)** queues for MIDI, commands, or telemetry.
- Use `juce::AbstractFifo` or `boost::lockfree` patterns.

### 3. Memory & Alignment
- Use `alignas(64)` for structures involved in high-speed modulation to avoid false sharing.
- Pre-allocate all voice memory and modulation buffers.

### 4. Code Hints
- Use `[[likely]]` and `[[unlikely]]` for error paths.
- Ensure all DSP functions are marked `noexcept`.

## 🔗 Referenced Headers
- [IVoice.h](file:///d:/desarrollos/ABDOmega/SOURCE/DSP/Voices/IVoice.h)
- [ModulationRuntime.h](file:///d:/desarrollos/ABDOmega/SOURCE/DSP/Modulation/ModulationRuntime.h)
- [ISynthesisEngine.h](file:///d:/desarrollos/ABDOmega/SOURCE/DSP/Engines/ISynthesisEngine.h)
