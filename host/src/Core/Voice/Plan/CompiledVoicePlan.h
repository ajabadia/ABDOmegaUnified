#pragma once

#include "CompiledSignalSpace.h"
#include <cstdint>
#include <array>
#include <string>

namespace Omega::Core::Voice {

    /**
     * @brief A compiled DSP primitive (Oscillator, Filter, etc.) within a plan.
     */
    struct CompiledUnit {
        uint32_t nodeId = 0;              // Original node ID from preset
        uint32_t implementationId = 0;    // Numeric ID for renderer (JunoOsc, MS20Filter, etc.)
        
        static constexpr int kMaxParams = 8;
        uint32_t stableParamIds[kMaxParams] = { 0 }; // IDs for real-time modulation
        float baseValues[kMaxParams] = { 0.0f };      // Parameter base values
        
        uint8_t type = 0; // 0=Generator, 1=Processor, 2=Controller, 3=Mixer
        uint8_t executionOrderIndex = 0;
    };

    /**
     * @brief A signal connection between units (Audio or Modulation).
     */
    struct CompiledConnection {
        uint8_t fromUnit = 0;
        uint8_t toUnit = 0;
        uint8_t srcBus = 0;
        uint8_t dstBus = 0;
        float amount = 1.0f;
    };

    /**
     * @brief A direct binding between a modulation source and a parameter.
     */
    struct RuntimeModRoute {
        uint32_t targetParamId = 0; // Stable ID from ParamIdRegistry
        uint8_t sourceSignal = 0;   // Index from CompiledSignalSpace
        float amount = 0.0f;
        uint8_t reserved = 0;
    };

    /**
     * @brief Immutable, pre-compiled plan for a voice instance.
     * Designed to be shared across multiple voices playing the same preset.
     */
    struct CompiledVoicePlan {
        static constexpr int kMaxUnits = 16;
        static constexpr int kMaxConnections = 24;
        static constexpr int kMaxModRoutes = 64;
        static constexpr int kMaxBuses = 16;

        std::array<CompiledUnit, kMaxUnits> units;
        int unitCount = 0;

        std::array<CompiledConnection, kMaxConnections> connections;
        int connectionCount = 0;

        std::array<RuntimeModRoute, kMaxModRoutes> modRoutes;
        int modRouteCount = 0;

        std::array<uint8_t, kMaxUnits> executionOrder; // Indices into units array
        
        uint32_t planId = 0; // Hash for validation
        bool isInitialised = false;
    };

} // namespace Omega::Core::Voice
