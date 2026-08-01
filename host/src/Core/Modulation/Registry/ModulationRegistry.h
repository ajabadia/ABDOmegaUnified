#pragma once

#include "../Metadata/ModulationDescriptors.h"
#include <string>
#include <vector>

namespace Omega::Core::Modulation {

    /**
     * @brief Central registry for modulation capabilities.
     * VA 2.1: Acts as a semantic bridge for mapping IDs to stable DSP indices.
     */
    class ModulationRegistry {
    public:
        /**
         * @brief Resolves a high-level target ID to a stable binary ID.
         */
        static TargetStableId getStableId(const std::string& targetId);

        /**
         * @brief Maps a source ID to a signal index in CompiledSignalSpace.
         */
        static uint8_t getSignalIndex(const std::string& sourceId);

        /**
         * @brief Returns global modulation sources (Velocity, MW, etc.).
         */
        static std::vector<SourceDescriptor> getStaticSources();

        static bool isValidSource(const std::string& id);
        static bool isValidTarget(const std::string& id);
    };

} // namespace Omega::Core::Modulation
