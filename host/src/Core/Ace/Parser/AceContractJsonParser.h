#pragma once

#include "AceTypes.h"
#include <string>

namespace Omega {
namespace Core {
namespace Ace {

    /**
     * @brief Parses WASM JSON contracts into a ComponentInfo.
     * Extracted from AceManifestParser (Fase 5.2) — separate format, separate module.
     */
    class AceContractJsonParser {
    public:
        /**
         * @brief Parses a JSON contract (typically from WASM introspection).
         */
        static bool parseContractJson(const std::string& json, ComponentInfo& info);
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
