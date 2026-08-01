#pragma once

#include "../Model/AceTypes.h"
#include <juce_core/juce_core.h>

#include "ManifestSourceZip.h"

namespace Omega {
namespace Core {
namespace Ace {

    class AceCatalog;

    /**
     * @brief Carga de componentes ACE empaquetados en un acepack.
     * [Fase 5.6]: extraído de AcePackLoader — fuente "acepack"
     * (itera las entradas del zip y delega cada manifest a ManifestSourceZip).
     */
    class ManifestSourceAcePack {
    public:
        explicit ManifestSourceAcePack(AceCatalog& catalog);

        bool loadFromAcePack(const juce::File& acePackFile);

    private:
        AceCatalog& mCatalog;
        ManifestSourceZip mZip;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
