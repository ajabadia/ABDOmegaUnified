#pragma once

#include <string>
#include <vector>

namespace Omega::Core::Modulation {

    /**
     * @brief Port types for semantic discovery.
     */
    enum class ModPortType {
        Audio,      // Audio signals (High-res mono/stereo)
        CV,         // Modulation signals (Bipolar/Unipolar)
        Gate,       // Binary/Trigger signals
        MIDI,       // Raw MIDI event stream
        Digital     // Custom digital data
    };

    /**
     * @brief Option for discrete port values (e.g. Waveform selections).
     */
    struct PortOption {
        float value;
        std::string label;
    };

} // namespace Omega::Core::Modulation
