#pragma once

#include <juce_core/juce_core.h>
#include "../Model/AceTypes.h"

namespace Omega {
namespace Core {
namespace Ace {
namespace ExportUI {

    /**
     * @brief Builds the complete "ui" block of the Era 7 contract:
     * skin, dimensions, controls, jacks, and the Era 7.2 layout (gridSnap + containers).
     * Pure — no side effects, no catalog/validator access.
     */
    juce::var uiToVar(const ComponentInfo& info);

} // namespace ExportUI
} // namespace Ace
} // namespace Core
} // namespace Omega
