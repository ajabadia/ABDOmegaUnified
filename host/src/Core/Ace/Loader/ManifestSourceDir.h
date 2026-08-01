#pragma once

#include "../Model/AceTypes.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Ace {

    class AceCatalog;

    /**
     * @brief Carga de componentes ACE desde directorios de módulos.
     * [Fase 5.6]: extraído de AcePackLoader — fuente "directorio"
     * (manifest .acemm/.yaml + introspcción WASM híbrida).
     */
    class ManifestSourceDir {
    public:
        explicit ManifestSourceDir(AceCatalog& catalog);

        bool loadFromDirectory(const juce::File& directory);
        bool loadFromModulesDirectory(const juce::File& modulesDir);

    private:
        AceCatalog& mCatalog;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
