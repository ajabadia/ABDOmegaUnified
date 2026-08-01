#pragma once

#include "../Model/AceTypes.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Ace {

    class AceCatalog;

    /**
     * @brief Carga de un manifest individual desde una entrada de archivo.
     * [Fase 5.6]: extraído de AcePackLoader — fuente "zip/archive"
     * (parsea YAML del stream, hash SHA-256, telemetría y comprobación
     * AUDIT_REPORT.md dentro del zip).
     */
    class ManifestSourceZip {
    public:
        explicit ManifestSourceZip(AceCatalog& catalog);

        bool loadFromArchive(juce::InputStream& archiveStream,
                             const juce::String& sourceName,
                             const juce::String& fullSourcePath);

    private:
        AceCatalog& mCatalog;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
