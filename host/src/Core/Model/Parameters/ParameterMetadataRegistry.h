#pragma once

#include "ParameterDescriptor.h"
#include <map>
#include <string>

namespace Omega::Core {

    /**
     * @brief Central registry for all parameters in the OMEGA platform.
     * Manages metadata, MIDI mappings, and default registrations.
     */
    class ParameterMetadataRegistry {
    public:
        static ParameterMetadataRegistry& getInstance();

        /**
         * @brief Registers a new parameter in the system.
         */
        void registerParameter(const ParameterDescriptor& desc);

        /**
         * @brief Retrieves a parameter by its ID.
         */
        const ParameterDescriptor* getParameter(const std::string& id) const;

        /**
         * @brief Returns the entire registry.
         */
        const std::map<std::string, ParameterDescriptor>& getAllParameters() const;

        /**
         * @brief Resolves a CC number to a Parameter ID.
         */
        std::string getParamIdFromCC(int cc) const;

        /**
         * @brief Resolves a CC number to a Modulation Source.
         */
        ModSource getModSourceFromCC(int cc) const;

        /**
         * @brief Initializes the registry with default Era 7 parameters.
         */
        void initializeDefaults();

    private:
        ParameterMetadataRegistry();
        std::map<std::string, ParameterDescriptor> mParameters;
        std::map<int, std::string> mMidiMap;
    };

} // namespace Omega::Core
