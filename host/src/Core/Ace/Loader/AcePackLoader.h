#pragma once

#include "../Model/AceTypes.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Ace {

    class AceCatalog;

    /**
     * @brief Utility for loading ACE components from various sources.
     */
    class AcePackLoader {
    public:
        AcePackLoader(AceCatalog& catalog);

        bool loadFromDirectory(const juce::File& directory);
        bool loadFromModulesDirectory(const juce::File& modulesDir);
        bool loadFromAcePack(const juce::File& acePackFile);

        /**
         * @brief Internal archive loader.
         */
        bool loadFromArchive(juce::InputStream& archiveStream, const juce::String& sourceName, const juce::String& fullSourcePath);

        /**
         * @brief Registers telemetry pins for visualizable ports (outputs and
         * audio inputs). Moved here from AceManifestParser (Fase 5.2) to keep
         * the parser pure; call AFTER parsing a YAML manifest.
         */
        static void registerPortTelemetry(ComponentInfo& info);

    private:
        AceCatalog& mCatalog;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
