#pragma once

#include <yaml-cpp/yaml.h>

namespace Omega {
namespace Core {
namespace Ace {
namespace YamlHelpers {

    /**
     * @brief Safely reads a float scalar from a YAML node.
     * Pure helper — no JUCE dependency, unit-testable in isolation.
     */
    float safeAsFloat(const YAML::Node& node, float fallback);

    /**
     * @brief Safely reads an int scalar from a YAML node.
     * Pure helper — no JUCE dependency, unit-testable in isolation.
     */
    int safeAsInt(const YAML::Node& node, int fallback);

} // namespace YamlHelpers
} // namespace Ace
} // namespace Core
} // namespace Omega
