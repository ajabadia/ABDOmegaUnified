#pragma once

#include <vector>
#include <juce_core/juce_core.h>
#include "../Model/AceTypes.h"

namespace Omega {
namespace Core {
namespace Ace {
namespace ExportAttachments {

    /**
     * @brief Serializes a single Attachment into a juce::DynamicObject var.
     * Pure — no side effects, no catalog/validator access.
     */
    juce::var attachmentToVar(const Attachment& a);

    /**
     * @brief Serializes a list of attachments into a juce::var array.
     * Pure helper, reused by ExportControls.
     */
    juce::var attachmentsToVar(const std::vector<Attachment>& attachments);

} // namespace ExportAttachments
} // namespace Ace
} // namespace Core
} // namespace Omega
