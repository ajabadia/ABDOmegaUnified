#pragma once

#include <cstdint>

namespace Omega::Core::Modulation {

    /**
     * @brief Tipos de señal soportados por el ModulationGraph.
     */
    enum class SignalType : uint8_t {
        Control  = 0,  // 0-1, lento, por bloque, rampa lineal
        Audio    = 1,  // -1..1, audio-rate, por sample
        Trigger  = 2,  // Edge events (0->1), por sample
        Pitch    = 3,  // Semitonos, por bloque, exponencial
        Phase    = 4   // 0-2PI, audio-rate, por sample, wrap automático
    };

    /**
     * @brief Atributos estáticos de los tipos de señal.
     */
    struct SignalTypeTraits {
        static constexpr bool isPerSample(SignalType t) {
            return t == SignalType::Audio || t == SignalType::Phase || t == SignalType::Trigger;
        }

        static constexpr bool isPerBlock(SignalType t) {
            return t == SignalType::Control || t == SignalType::Pitch;
        }

        static constexpr bool needsWrap(SignalType t) {
            return t == SignalType::Phase;
        }
    };

    /**
     * @brief Valor de señal (Union para eficiencia en el paso entre nodos).
     */
    union SignalValue {
        float control;   // Valor único para bloque
        float* audio;    // Puntero a buffer (per-sample)
    };

} // namespace Omega::Core::Modulation
