#pragma once

#include "AceTypes.h"
#include <juce_data_structures/juce_data_structures.h>
#include <vector>
#include <string>

namespace Omega::Core::Ace {

    class AceCatalog;

    /**
     * @brief Consistency validator for ACE manifests and components.
     * Logic: Verifies structural integrity, visibility flags, and spatial boundaries.
     */
    class AceValidator {
    public:
        explicit AceValidator(const AceCatalog& c) : mCatalog(c) {}

        /**
         * @brief Validates a module manifest against Era 7 compliance rules.
         */
        ValidationReport validateManifest(const ComponentInfo& info) const;

    private:
        const AceCatalog& mCatalog;
    };

} // namespace Omega::Core::Ace
