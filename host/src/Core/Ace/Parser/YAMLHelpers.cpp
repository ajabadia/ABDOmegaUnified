#include "YAMLHelpers.h"

namespace Omega {
namespace Core {
namespace Ace {
namespace YamlHelpers {

    float safeAsFloat(const YAML::Node& node, float fallback) {
        if (node.IsDefined() == false || node.IsNull() == true) return fallback;
        try { return node.as<float>(); } catch (...) { return fallback; }
    }

    int safeAsInt(const YAML::Node& node, int fallback) {
        if (node.IsDefined() == false || node.IsNull() == true) return fallback;
        try { return node.as<int>(); } catch (...) { return fallback; }
    }

} // namespace YamlHelpers
} // namespace Ace
} // namespace Core
} // namespace Omega
