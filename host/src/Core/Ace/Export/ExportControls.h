#pragma once

#include <vector>
#include <juce_core/juce_core.h>
#include "../Model/AceTypes.h"

namespace Omega {
namespace Core {
namespace Ace {
namespace ExportControls {

    /**
     * @brief Serializes a list of UIItems (controls or jacks) into a
     * juce::var array, including pos + presentation + attachments.
     * Pure — no side effects, no catalog/validator access.
     */
    juce::var uiItemsToVar(const std::vector<UIItem>& items);

} // namespace ExportControls
} // namespace Ace
} // namespace Core
} // namespace Omega
