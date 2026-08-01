#pragma once

#include "EngineConfig.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Maps modular architectural components to the final EngineConfig struct.
     */
    class VoiceArchToEngineConfigMapper {
    public:
        /**
         * @brief Maps modular architectural components to the final EngineConfig struct.
         */
        /*
        static void mapArchitecture(const Preset::VoiceArchitecture& arch, VoiceConfig& cfg) {
            ...
        }
        */

    private:
        static OscillatorMode mapOscMode(const std::string& compId) {
            if (compId == "OSC-VA-001" || compId == "OSC-JUNO-DCO") return OscillatorMode::JunoDco;
            if (compId == "OSC-VA-004" || compId == "OSC-JP-SUPER") return OscillatorMode::JpSuperSaw;
            return OscillatorMode::JunoDco; // Default fallback
        }

        static FilterType mapFilterType(const std::string& compId) {
            if (compId == "VCF-JUNO-001" || compId == "VCF-IR3109") return FilterType::JunoIR3109;
            if (compId == "VCF-KORG-35") return FilterType::Korg35;
            if (compId == "VCF-JP-8000" || compId == "FLT-VA-004") return FilterType::JP8080; 
            return FilterType::JunoIR3109;
        }
    };

} // namespace Service
} // namespace Core
} // namespace Omega
