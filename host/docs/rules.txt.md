Aquí está el archivo rules.md completo para el proyecto OMEGA, diseñado para que cualquier IA (o desarrollador humano) pueda trabajar en el código manteniendo consistencia arquitectónica y de calidad.
Markdown
Copy
Code
Preview
# OMEGA Synthesizer - Architecture Rules & Guidelines

> **Version:** 1.0.0  
> **Last Updated:** 2025-01-XX  
> **Applies to:** All C++, Lua, and CMake code in the OMEGA project

---

## 1. PHILOSOPHY & PRINCIPLES

### 1.1 Core Tenets
1. **Audio Thread Safety First** - Never compromise lock-free guarantees for convenience
2. **Zero Allocation in Realtime** - Pre-allocate everything; use pools
3. **Explicit is Better than Implicit** - No hidden allocations, no magic conversions
4. **Measure, Don't Guess** - Profile before optimizing; optimize hot paths only
5. **Fidelity Matters** - Document hardware emulation decisions with `[Fidelity]`
6. **Innovation Visible** - Mark novel approaches with `[Innovation]`

### 1.2 Trade-off Hierarchy
When in conflict, prioritize:
Correctness > Thread Safety > Performance > Memory Usage > Code Brevity
plain
Copy

---

## 2. PROJECT STRUCTURE

### 2.1 Directory Organization
Source/
├── Core/           # Engine routing, presets, scripting, modulation graph
├── DSP/            # All audio processing (engines, voices, FX, modulation)
│   ├── Common/     # Shared DSP utilities, SIMD wrappers
│   ├── Engines/    # Synthesis engines (VA, Spectral, Wavetable, etc.)
│   ├── Voices/     # Voice management and allocation
│   ├── Modulation/ # Modulation sources and routing
│   └── FX/         # Effects modules and rack system
├── UI/             # User interface components
│   ├── Common/     # Shared UI utilities, themes
│   ├── Components/ # Reusable widgets (knobs, visualizers)
│   ├── Panels/     # Main panel implementations
│   └── Browser/    # Preset browser and management
├── Analysis/       # Audio analysis and model creation
└── Plugin/         # Plugin wrapper and entry points
plain
Copy

### 2.2 File Naming
| Type | Pattern | Example |
|------|---------|---------|
| Header | `PascalCase.h` | `ModulationGraph.h` |
| Implementation | `PascalCase.cpp` | `ModulationGraph.cpp` |
| Interface | `I` + `PascalCase.h` | `IVoice.h`, `IEngine.h` |
| Tests | `Test` + `PascalCase.cpp` | `TestModulationGraph.cpp` |
| Lua scripts | `snake_case.lua` | `algorithmic_bass.lua` |

---

## 3. NAMING CONVENTIONS

### 3.1 C++ Code

```cpp
// Namespaces: nested, descriptive
namespace Omega::DSP::Engines {
    // Classes: PascalCase
    class VirtualAnalogEngine : public ISynthesisEngine {
    public:
        // Public methods: camelCase
        void prepare(double sampleRate, int samplesPerBlock) override;
        
        // Getters/setters: camelCase with get/set prefix
        float getCutoffFrequency() const noexcept;
        void setCutoffFrequency(float freq) noexcept;
        
    private:
        // Member variables: m_ prefix + camelCase
        float m_cutoffFrequency = 1000.0f;
        std::atomic<float>* m_cutoffParam = nullptr;
        
        // Static constants: k + PascalCase
        static constexpr float kMinCutoff = 20.0f;
        static constexpr float kMaxCutoff = 20000.0f;
        
        // Private methods: camelCase, descriptive
        void updateFilterCoefficients() noexcept;
    };
}

// Enums: enum class + PascalCase, values PascalCase
enum class FilterType {
    LowPass,
    HighPass,
    BandPass,
    Notch
};

// Template parameters: Single uppercase or descriptive
template<typename T, int N>
class FixedArray { };

// Concepts (C++20): PascalCase, descriptive
template<typename T>
concept Modulatable = requires(T t, float v) {
    { t.setModulation(v) } -> std::same_as<void>;
};
3.2 Lua Code
lua
Copy
-- Modules: snake_case
local modulation = require("omega.modulation")

-- Functions: snake_case
function calculate_lfo_phase(rate, time)
    return (rate * time) % 1.0
end

-- Constants: UPPER_SNAKE_CASE
local MAX_VOICES = 32
local PI = 3.14159265359

-- Tables as namespaces: CamelCase
local Envelope = {}
Envelope.State = {
    Idle = 0,
    Attack = 1,
    Decay = 2,
    Sustain = 3,
    Release = 4
}
4. AUDIO THREAD SAFETY
4.1 Golden Rules
Table
Rule	Rationale	Enforcement
No heap allocation	new/malloc can block	Custom allocators, pools
No locks	Mutexes can block indefinitely	Atomics, lock-free queues
No exceptions	Stack unwinding is non-deterministic	noexcept, error codes
No virtual calls in inner loop	vtable indirection + cache miss	CRTP, function pointers
No I/O	Disk/network is unpredictable	Background threads only
No logging	printf can allocate/lock	Ring buffers, deferred logging
4.2 Lock-Free Patterns
cpp
Copy
// GOOD: Lock-free parameter access
class Processor {
    std::atomic<float>* m_paramCache[64]; // Cached in constructor
    
    void processBlock(AudioBuffer<float>& buffer) noexcept {
        for (int i = 0; i < buffer.getNumSamples(); ++i) {
            float cutoff = m_paramCache[0]->load(std::memory_order_relaxed);
            // ... use cutoff
        }
    }
};

// BAD: String lookup in audio thread
void processBlockBad(AudioBuffer<float>& buffer) {
    float cutoff = apvts.getParameter("cutoff")->getValue(); // NEVER
}

// GOOD: SPSC queue for commands
class CommandQueue {
    juce::AbstractFifo fifo{1024};
    std::array<Command, 1024> buffer;
    
public:
    void push(Command cmd) noexcept { /* called from UI */ }
    void popAll(auto&& consumer) noexcept { /* called from audio */ }
};
4.3 Memory Pools
cpp
Copy
// Per-thread pool, no synchronization needed
class ThreadLocalPool {
    alignas(64) struct Pool {
        std::byte buffer[65536];
        std::atomic<size_t> cursor{0};
    };
    static thread_local Pool s_pool;
    
public:
    static void* allocate(size_t size) noexcept {
        size = align_up(size, 16);
        auto pos = s_pool.cursor.fetch_add(size, std::memory_order_relaxed);
        if (pos + size > sizeof(s_pool.buffer)) [[unlikely]] {
            return fallback_allocate(size); // Global lock-free pool
        }
        return &s_pool.buffer[pos];
    }
    
    static void reset() noexcept {
        s_pool.cursor.store(0, std::memory_order_relaxed);
    }
};
5. MODULATION SYSTEM
5.1 Signal Types
Table
Type	Range	Update Rate	Use Cases
Control	0.0-1.0	Control-rate (per block)	LFOs, envelopes slow
Audio	-1.0-1.0	Audio-rate (per sample)	Audio FM, ring mod
Trigger	0/1 edge	Event-based	Note on, clock reset
Pitch	±semitones	Control or audio	Pitch bend, vibrato
Phase	0.0-2π	Audio-rate	Phase modulation
5.2 Modulation Graph Rules
cpp
Copy
// Nodes must declare their processing latency
struct ModNode {
    virtual int getLatencySamples() const = 0;
    virtual SignalType getOutputType() const = 0;
    
    // Processing: no allocations, noexcept
    virtual void processBlock(ModBlockContext& ctx) noexcept = 0;
};

// Connections are validated at compile-time where possible
template<SignalType SourceType, SignalType DestType>
struct Connection {
    static_assert(can_connect_v<SourceType, DestType>, 
                  "Incompatible signal types");
    float amount = 1.0f;
    Curve curve = Curve::Linear;
};

// Feedback loops: allowed with 1-sample delay compensation
class FeedbackPath {
    float m_previousOutput = 0.0f;
    
public:
    float process(float input) noexcept {
        float output = m_previousOutput;
        m_previousOutput = input; // Delay by 1 sample
        return output;
    }
};
6. VOICE MANAGEMENT
6.1 Voice Stealing Priority
cpp
Copy
enum class StealingStrategy {
    Oldest,           // Timestamp más bajo (default, más musical)
    Quietest,         // Menor amplitud estimada
    LeastModulated,   // Menor complejidad de modulación
    Random,           // Aleatorio ponderado
    MLPredicted       // Modelo neural predice menos audible
};

// Implementación debe ser lock-free
class VoiceManager {
    std::array<VoiceSlot, 32> m_voices;
    std::atomic<uint64_t> m_globalCounter{0};
    
public:
    void noteOn(int note, float velocity, int channel) noexcept {
        // 1. Buscar inactiva (lock-free check)
        for (int i = 0; i < m_activeLimit.load(); ++i) {
            if (!m_voices[i].active.load(std::memory_order_acquire)) {
                activate(i, note, velocity);
                return;
            }
        }
        
        // 2. Stealing: encontrar víctima sin locks
        int victim = findStealingVictim();
        m_voices[victim].voice->enterReleaseState(0.005f); // 5ms fade
        activate(victim, note, velocity);
    }
};
6.2 Voice Architecture Composition
cpp
Copy
// Voices are composed, not inherited
struct VoiceArchitecture {
    std::array<OscillatorConfig, 4> oscillators;
    std::array<FilterConfig, 2> filters;
    std::array<ModSourceConfig, 8> modulators;
    std::array<FXSlot, 4> voiceFX;
    RoutingMatrix routing;
};

class ComposedVoice : public IVoice {
    VoiceArchitecture m_arch;
    std::byte* m_memoryPool; // Aligned, pre-allocated
    
public:
    void prepare(const VoiceArchitecture& arch, double sr) {
        // Placement new de todos los processors en el pool
        // Sin heap allocation
    }
};
7. ENGINE IMPLEMENTATION
7.1 Engine Interface
cpp
Copy
class ISynthesisEngine {
public:
    virtual ~ISynthesisEngine() = default;
    
    // Lifecycle: llamado desde UI thread
    virtual void prepare(double sampleRate, int samplesPerBlock) = 0;
    virtual void reset() = 0;
    
    // Procesamiento: llamado desde audio thread, noexcept
    virtual void renderNextBlock(AudioBuffer<float>& buffer, 
                                  const MidiBuffer& midi) noexcept = 0;
    
    // Visualización: thread-safe, datos atómicos
    virtual void getSpectralData(std::span<float> dest) const noexcept = 0;
    virtual void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept = 0;
    
    // MPE: per-note expression
    virtual void notePitchBend(int note, int channel, float semitones) noexcept = 0;
    virtual void notePressure(int note, int channel, float pressure) noexcept = 0;
    virtual void noteTimbre(int note, int channel, float timbre) noexcept = 0;
    
    // Cambio de engine: preparar nuevo, luego swap atómico
    virtual bool supportsSeamlessSwitch() const { return false; }
};
7.2 Engine-Specific Fidelity
cpp
Copy
// Virtual Analog: documentar emulación hardware
class VirtualAnalogEngine : public ISynthesisEngine {
    // [Fidelity] 8253 timer quantization: 12-bit DAC, 1MHz clock
    // [Audit] Roland Juno-106 Service Manual, p. 12-15
    // [Fix] v1.2: corregido drift térmico compartido entre voces
    void updateOscillatorFrequency() noexcept;
    
    // [Fidelity] BBD MN3009: 512 stages, 0.02% THD typical
    // [Innovation] Interpolación de tap variable para chorus estéreo
    void processBBDChorus(float* left, float* right, int numSamples) noexcept;
};
8. UI DEVELOPMENT
8.1 Threading Model
plain
Copy
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  UI Thread  │◄───►│  Core/Msg   │◄───►│ Audio Thread│
│  (JUCE msg) │     │   Queue     │     │  (Realtime) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
   User input         Command FIFO          Parameter
   Visual update      (lock-free)           atomics
8.2 Component Rules
cpp
Copy
// UI components never block audio thread
class ModulatedSlider : public juce::Slider {
    std::atomic<float>* m_modValue = nullptr; // Escrito por audio, leído por UI
    
public:
    void paint(juce::Graphics& g) override {
        // Leer valor atómico para visualización
        float mod = m_modValue ? m_modValue->load(std::memory_order_relaxed) : 0.0f;
        
        // Dibujar base + anillo de modulación
        drawBase(g);
        drawModulationRing(g, mod);
    }
    
    // Cambios de usuario: notificar a APVTS, nunca tocar audio directamente
    void valueChanged() override {
        // APVTS notifica al audio thread vía atomics
    }
};
8.3 Visualization Performance
Target: 60 FPS para UI, 30 FPS para visualizadores pesados
Estrategia: Double buffering, render en background thread si es complejo
Datos: Copia atómica de estado del audio thread, nunca acceder directamente
9. PRESET SYSTEM (Git for Sounds)
9.1 Data Model
cpp
Copy
struct PresetVersion {
    Hash hash;                    // SHA-256 del contenido normalizado
    Hash parent;                  // Commit anterior (optional)
    Author author;
    TimeStamp date;
    String message;               // "Añadí modulación de filter por LFO 2"
    
    // Diff estructurado
    std::vector<ParamChange> changes; // {path: "osc1.waveform", old: 0, new: 2}
    AudioFeatures features;       // FFT promedio, centroid, etc.
};

class PresetRepository {
public:
    // Branching
    Branch createBranch(const String& name, Hash fromCommit);
    void mergeBranch(const Branch& branch, MergeStrategy strategy);
    
    // Diff con audio A/B
    AudioDiff generateAudioDiff(Hash commitA, Hash commitB);
    
    // Búsqueda semántica: embeddings de audio
    std::vector<PresetVersion> searchBySimilarity(const AudioFeatures& target);
};
9.2 Serialization Format
yaml
Copy
# Preset human-readable (YAML)
omega_preset_version: "2.0"
name: "Bass - Acid Growl"
author: "user123"
date: "2025-01-15T14:30:00Z"
parent: "a1b2c3d4..."  # Git-like versioning

engine:
  type: "VirtualAnalog"
  version: "1.0"

parameters:
  osc1:
    waveform: 2  # Saw
    pitch: 0.0
    fine: -0.05
  filter:
    type: "Ladder"
    cutoff: 800.0  # Hz, no normalizado para legibilidad
    resonance: 0.7
    drive: 0.3
    
modulation:
  routes:
    - source: "LFO1"
      dest: "filter.cutoff"
      amount: 0.4
      curve: "exponential"
      
metadata:
  tags: ["bass", "acid", "growl", "resonant"]
  bpm: 130
  key: "C"
  preview_notes: [36, 48, 36]  # Secuencia de demo
10. SCRIPTING (LuaJIT)
10.1 API Design Principles
Sandboxed: Sin acceso a filesystem, network, o system calls
Deterministic: Mismo seed = mismo resultado (para reproducibilidad)
Performant: LuaJIT FFI para acceso a estructuras C cuando sea necesario
10.2 Example Patterns
lua
Copy
-- Secuenciador euclidiano
local seq = omega.Seq.euclidean(16, 5)  -- 16 steps, 5 hits
    :rotate(2)
    :mutate(function(evt, step)
        if step % 4 == 0 then
            evt.velocity = evt.velocity * 0.8  # Acento débil
        end
        return evt
    end)

-- Modulación procedural
local lfo = omega.LFO.new()
    :waveform(function(phase)
        -- Onda custom: seno con glitch aleatorio controlado
        local base = math.sin(phase * 2 * math.pi)
        if math.random() < 0.01 then
            return base * 2.0
        end
        return base
    end)
    :rate(omega.BPM.sync(1, 4))  -- 1/4 note synced

-- Conexión
omega.patch.filter.cutoff:modulate(lfo, 0.5, "exponential")
11. TESTING & QUALITY
11.1 Test Categories
Table
Type	Framework	Trigger	Coverage Target
Unit	Catch2	Every commit	Core DSP: 90%
Property	RapidCheck	Every commit	Modulation: 80%
Fuzz	libFuzzer	Nightly	All parsers: 100%
Benchmark	Google Benchmark	PR	Hot paths
Integration	Custom	Release	Full pipeline
11.2 DSP Testing
cpp
Copy
TEST_CASE("Envelope exponential curve accuracy") {
    Omega::DSP::Envelope env;
    env.setSampleRate(48000.0);
    env.setAttack(10.0f);  // ms
    
    env.noteOn();
    
    // Verificar que en 10ms alcanza ~63% (1 - 1/e)
    for (int i = 0; i < 480; ++i) env.processSample();
    
    float level = env.getLevel();
    REQUIRE(level == Approx(0.632f).epsilon(0.01f));
}

TEST_CASE("Modulation graph detects cycles") {
    ModulationGraph graph;
    auto nodeA = graph.addNode<LFO>();
    auto nodeB = graph.addNode<Envelope>();
    
    graph.connect(nodeA, nodeB);
    graph.connect(nodeB, nodeA);  // Ciclo
    
    REQUIRE_THROWS_AS(graph.compile(), CycleDetectedError);
}
11.3 Performance Budgets
cpp
Copy
// Benchmarks con límites estrictos
BENCHMARK("Voice processing 16 voices") {
    auto voices = createTestVoices(16);
    
    BENCHMARK_ADVANCED("Block 128 samples")(Catch::Benchmark::Chronometer meter) {
        AudioBuffer<float> buffer(2, 128);
        meter.measure([&] {
            for (auto& v : voices) v->renderBlock(buffer);
        });
    };
    
    // Requisito: < 10% CPU en M3 Pro @ 48kHz
    REQUIRE(meter.elapsed() < 2.0ms);  
};
12. DOCUMENTATION
12.1 Code Comments
cpp
Copy
// [Fidelity] Emula cuantización del 8253 Programmable Interval Timer
// El Juno-106 usa un timer de 16 bits con clock de 2MHz, dividido por
// el valor del latch. Esto causa "zipper noise" en frecuencias bajas.
// [Reference] Roland Juno-106 Service Notes, Section 2.3
// [Implementation] Ver calculateQuantizedFrequency() para detalles
void setFrequency(float hz) noexcept;

// [Innovation] Interpolación de fase cuadrática para anti-aliasing
// Mejor que PolyBLEP para formas de onda arbitrarias.
// [Paper] "Bandlimited Oscillators" by Välimäki & Huovilainen
void generateWaveform(float phase) noexcept;
12.2 Commit Messages
plain
Copy
[Fidelity] Fix 8253 timer quantization for sub-100Hz notes

- Implementa latch de 16 bits con clock de 2MHz
- Añade dithering térmico basado en temperatura simulada
- Corrige issue #42: zipper noise en graves

Test: A/B con Juno-106 físico, aprobado por 3 beta testers
13. TOOLING & WORKFLOW
13.1 Required Tools
Table
Purpose	Tool	Configuration
Build	CMake 3.25+	Presets para todos los targets
Format	clang-format	.clang-format en repo
Lint	clang-tidy	.clang-tidy con checks DSP
Analysis	PVS-Studio	Nightly static analysis
Coverage	gcov + codecov	PRs requieren +1%
Docs	Doxygen + Sphinx	Deploy a GitHub Pages
13.2 CI/CD Pipeline
plain
Copy
Push to main ──┬── Build & Test (Debug) ──┬── Merge
               │                           │
PR opened ─────┼── Build & Test (Release)─┼── Review required
               │   ├── macOS (x64, ARM64) │
               │   ├── Windows (x64)      │
               │   └── Linux (x64)        │
               │                           │
               └── Static Analysis ────────┘
                   ├── clang-tidy
                   ├── PVS-Studio
                   └── cppcheck
14. GLOSSARY
Table
Term	Definition
APVTS	AudioProcessorValueTreeState - sistema de parámetros de JUCE
BBD	Bucket Brigade Device - delay analógico con capacitores
CRTP	Curiously Recurring Template Pattern - polimorfismo estático
MPE	MIDI Polyphonic Expression - control por-nota
SPSC	Single-Producer Single-Consumer - patrón de queue
VA	Virtual Analog - emulación de sintetizadores analógicos
15. APPENDIX: QUICK REFERENCE
15.1 Audio Thread Checklist
Before committing code in DSP/ or Plugin/:
[ ] No new/delete/malloc/free
[ ] No std::mutex, std::lock_guard, etc.
[ ] No exceptions (mark noexcept)
[ ] No virtual calls in inner loops
[ ] No I/O operations
[ ] No logging to console/file
[ ] All parameters via cached atomics
[ ] SIMD aligned reads/writes
[ ] Branch prediction hints ([[likely]]/[[unlikely]])
15.2 Performance Targets
Table
Scenario	Target	Measured On
16 voices VA engine	< 5% CPU	MacBook Pro M3, 48kHz
256 parciales spectral	< 15% CPU	Same
UI response	< 16ms	Any supported hardware
Preset load	< 100ms	SSD
Questions? Open an issue with label architecture
Suggestions? PRs welcome, requieren aprobación de 2 maintainers
plain
Copy

---

Este `rules.md` es **completamente autocontenido**. Cualquier IA puede:

1. Entender la filosofía del proyecto sin conocer JUNiO 601 ni NEURONiK
2. Escribir código consistente con los ejemplos proporcionados
3. Mantener la calidad técnica mediante checklists concretas
4. Extender el sistema siguiendo los patrones establecidos

¿Quieres que añada alguna sección adicional, como **"Common Pitfalls"** con errores reales de desarrollo de sintetizadores, o **"Performance Case Studies"** con ejemplos de optimización?