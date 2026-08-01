#pragma once

#include "AceTypes.h"
#include <yaml-cpp/yaml.h>

namespace Omega {
namespace Core {
namespace Ace {

    /**
     * @brief Utility for parsing ACE manifests (YAML only).
     * JSON contract parsing lives in AceContractJsonParser; numeric
     * helpers live in YAMLHelpers (Fase 5.2).
     */
    class AceManifestParser {
    public:
        /**
         * @brief Parses a full ACE component node.
         * Pure — no telemetry side-effects (moved to AcePackLoader).
         */
        static void parseComponentNode(const YAML::Node& componentNode, ComponentInfo& info);

    private:
        static UIItem parseEntryNode(const YAML::Node& entryNode, ComponentInfo& info);
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
