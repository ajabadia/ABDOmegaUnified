#pragma once

#include "CompiledVoicePlan.h"
#include "EngineConfig.h"
#include <array>

namespace Omega {
namespace Core {
namespace Model {

    /**
     * @brief Snapshot inmutable y pre-compilado para el Audio Thread (Era 7).
     * Contiene todo lo necesario para renderizar un bloque de audio sin realizar búsquedas.
     */
    struct RuntimeSnapshot {
        // Topología de las voces (Grafo de síntesis y ruteo de modulación)
        ::Omega::Core::Voice::CompiledVoicePlan voicePlan;
        
        // Configuración de las voces (Era 7.2.3 Aseptic)
        ::Omega::Core::Service::VoiceConfig voiceConfig;

        // Tabla de parámetros globales (Gain, FX Mix, etc.)
        // Indexada por GlobalParamId (casteado a int)
        std::array<float, 256> globalParams;
        
        // ID único para trazabilidad y validación de cambios atómicos
        uint32_t snapshotId { 0 };
        bool isValid { false };

        RuntimeSnapshot() {
            globalParams.fill(0.0f);
        }
    };

} // namespace Model
} // namespace Core
} // namespace Omega
