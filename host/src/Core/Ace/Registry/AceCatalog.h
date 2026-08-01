#pragma once

#include "AceTypes.h"
#include <memory>
#include <filesystem>
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Ace {

    /**
     * @brief Centralized catalog of available ACE components.
     * Manages the registry and delegates parsing/loading to specialized classes.
     */
    class AceCatalog {
    public:
        AceCatalog();
        
        /**
         * @brief Registers a component in the catalog.
         * Performs strict validation before adding.
         */
        void registerComponent(const ComponentInfo& info);

        /**
         * @brief Retrieves a component by its unique ID.
         */
        const ComponentInfo* getComponent(const std::string& id) const;

        std::vector<const ComponentInfo*> listByFamilyAndEngine(const std::string& family, const std::string& engine) const;
        std::vector<const ComponentInfo*> getComponents() const;
        
        /**
         * @brief Searches for components based on a semantic query.
         */
        std::vector<const ComponentInfo*> findComponents(const std::string& query) const;

        std::string getFallbackId(const std::string& family, const std::string& engine) const;
        void buildFallbacks();

        /**
         * @brief Ingestion methods (delegated to AcePackLoader).
         */
        bool loadFromDirectory(const juce::File& directory);
        bool loadFromModulesDirectory(const juce::File& modulesDir);
        bool loadFromAcePack(const juce::File& acePackFile);

        /**
         * @brief Contract Export methods (delegated to AceContractExporter).
         */
        juce::var exportComponentContract(const std::string& id) const;
        void exportAllContracts(const juce::File& outputDir) const;
        juce::var generateSchema() const;

        /**
         * @brief Resource stream access.
         */
        std::unique_ptr<juce::InputStream> getResourceStream(const std::string& componentId, const std::string& resourcePath) const;

    private:
        std::map<std::string, ComponentInfo> mComponents;
        std::map<std::string, std::string> mFallbacks;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
