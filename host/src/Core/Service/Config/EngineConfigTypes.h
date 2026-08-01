#pragma once

#include <cstdint>

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief High-level oscillator modes (Core-independent).
     */
    enum class OscillatorMode : uint8_t { 
        JunoDco, 
        JpSuperSaw,
        ProphecyPluck,
        ProphecyBrass,
        ProphecyReed,
        ProphecyVpm,
        ProphecyBowed,
        ProphecyNoiseComb,
        ProphecyElectricPiano,
        ProphecyOrgan,
        JpFeedback,
        JpDual,
        KorgMs20Vco,
        ProphecyWaveshaper,
        Jp8080Supersaw = JpSuperSaw,
        None = 99
    };

    /**
     * @brief Filter models available in the system.
     */
    enum class FilterType : uint8_t { 
        JunoIR3109, 
        Korg35, 
        JP8080, 
        JPFormant 
    };
    
    /**
     * @brief Operational mode for filter slots.
     */
    enum class FilterSlotMode : uint8_t {
        Standard,
        ResonantBank
    };

} // namespace Service
} // namespace Core
} // namespace Omega

// Forward-compatibility alias for legacy DSP code
namespace Omega {
namespace DSP {
namespace Engines {
namespace Modular {
    using FilterType = ::Omega::Core::Service::FilterType;
    using OscillatorMode = ::Omega::Core::Service::OscillatorMode;
    using FilterSlotMode = ::Omega::Core::Service::FilterSlotMode;
}
}
}
}
