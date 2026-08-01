#pragma once

#include "../Model/AceTypes.h"
#include "../Registry/AceCatalog.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Ace {

    /**
     * @brief Utility for exporting ACE contracts and generating schemas.
     */
    class AceContractExporter {
    public:
        /**
         * @brief Generates a technical contract JSON for a specific component.
         */
        static juce::var exportComponentContract(const ComponentInfo& info, const AceCatalog& catalog);

        /**
         * @brief Generates the global OMEGA Aseptic Module Schema.
         */
        static juce::var generateSchema();
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
