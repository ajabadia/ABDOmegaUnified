#pragma once

#include "../Model/AceTypes.h"
#include <juce_core/juce_core.h>

#include "ManifestSourceAcePack.h"
#include "ManifestSourceDir.h"
#include "ManifestSourceZip.h"

namespace Omega {
namespace Core {
namespace Ace {

    class AceCatalog;

    /**
     * @brief Orquestador de carga de componentes ACE desde distintas fuentes.
     * [Fase 5.6]: delega en ManifestSourceDir (directorios de módulos),
     * ManifestSourceAcePack (acepack) y ManifestSourceZip (entrada de archivo).
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
        ManifestSourceDir mDir;
        ManifestSourceAcePack mAcePack;
        ManifestSourceZip mZip;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
