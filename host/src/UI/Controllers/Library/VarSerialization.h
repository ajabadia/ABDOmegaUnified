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

    /**
     * @brief Serializes a vector of ParamValue into a DynamicObject var
     * keyed by param id-string -> value (wire format of the UI bridge).
     * Shared by OmegaUiBridge::forceRepaint and RpcParameterController::handleGetState.
     */
    juce::var serializeParamsToVar(const std::vector<Core::Model::ParamValue>& params);

    /**
     * @brief Builds the Era 7 UI wire patch object (single source of truth for
     * the patch shape pushed to the WebUI):
     * name/author/masterGainDb + modules (keyed params) + globalFxParams +
     * patchbayMatrix. Shared by OmegaUiBridge::forceRepaint (onStateUpdate)
     * and RpcParameterController::handleGetState (getState) so both emit
     * identical payloads.
     */
    juce::var buildPatchWireVar(const Core::Model::PatchDocument& doc);

} // namespace VarSerialization
} // namespace UI
} // namespace Omega
