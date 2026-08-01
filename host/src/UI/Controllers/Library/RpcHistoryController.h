#pragma once

#include <juce_core/juce_core.h>
#include <deque>
#include <functional>
#include "RpcBaseController.h"
#include "PatchDocument.h"

namespace Omega {
    namespace Core {
        namespace Service { class EngineConfigManager; }
        namespace Model { struct PatchDocument; }
    }

namespace UI {

    /**
     * @brief Shared undo/redo state across preset, rack and history commands.
     * Owned by OmegaUiBridge and passed to RpcPresetController,
     * RpcRackController and RpcHistoryController so every mutating command
     * feeds the same undo/redo stacks.
     */
    class PatchHistoryState {
    public:
        explicit PatchHistoryState(Core::Service::EngineConfigManager& engineConfig)
            : mEngineConfig(engineConfig) {}

        void pushUndoSnapshot();
        void applyAndNotify(const Core::Model::PatchDocument& doc, std::function<void()> onLoad);

        bool canUndo() const { return !mUndoStack.empty(); }
        bool canRedo() const { return !mRedoStack.empty(); }

        Core::Model::PatchDocument takeUndoSnapshot();
        Core::Model::PatchDocument takeRedoSnapshot();

        void setOnConfigChangedCallback(std::function<void()> callback) { mOnConfigChanged = callback; }
        Core::Service::EngineConfigManager& engineConfig() { return mEngineConfig; }

    private:
        Core::Service::EngineConfigManager& mEngineConfig;
        std::function<void()> mOnConfigChanged;

        std::deque<Core::Model::PatchDocument> mUndoStack;
        std::deque<Core::Model::PatchDocument> mRedoStack;
        static constexpr size_t kMaxUndo = 32;
    };

    /**
     * @brief Controller for undo/redo/history commands.
     */
    class RpcHistoryController : public RpcBaseController {
    public:
        explicit RpcHistoryController(PatchHistoryState& history)
            : mHistory(history) {}

        void registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad);

        juce::var handleUndo(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleRedo(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);

        // Version Control (Era 7 - Stubbed)
        juce::var handleGetHistory(const juce::var& requestId, const juce::var& payload);

    private:
        PatchHistoryState& mHistory;
    };

} // namespace UI
} // namespace Omega
