#pragma once

#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include "PatchDocument.h"

namespace Omega {
namespace UI {
namespace VarSerialization {

    /**
     * @brief Serializes a PatchDocument into a juce::var (DynamicObject).
     * Pure — no side effects, no engine access.
     */
    juce::var patchDocumentToVar(const Core::Model::PatchDocument& doc);

    /**
     * @brief Deserializes a juce::var into a PatchDocument.
     * Pure — no side effects, no engine access.
     */
    Core::Model::PatchDocument varToPatchDocument(const juce::var& v);

    /**
     * @brief Copies a ValueTree's primitive properties into a DynamicObject var.
     * Pure helper, reusable across controllers.
     */
    juce::var valueTreeToVar(const juce::ValueTree& tree);

} // namespace VarSerialization
} // namespace UI
} // namespace Omega
