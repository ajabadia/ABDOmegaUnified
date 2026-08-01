#include "RpcHistoryController.h"
#include "EngineConfigManager.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace UI {

    // -------------------------------------------------------------------------
    // PatchHistoryState (shared undo/redo state)
    // -------------------------------------------------------------------------

    void PatchHistoryState::pushUndoSnapshot()
    {
        mUndoStack.push_back(mEngineConfig.getPatchDocument());
        if (mUndoStack.size() > kMaxUndo)
            mUndoStack.pop_front();
        mRedoStack.clear();
    }

    void PatchHistoryState::applyAndNotify(const Core::Model::PatchDocument& doc, std::function<void()> onLoad)
    {
        mEngineConfig.applyPatch(doc);
        if (mOnConfigChanged) mOnConfigChanged();
        if (onLoad) onLoad();
    }

    Core::Model::PatchDocument PatchHistoryState::takeUndoSnapshot()
    {
        auto prev = mUndoStack.back();
        mUndoStack.pop_back();
        mRedoStack.push_back(mEngineConfig.getPatchDocument());
        return prev;
    }

    Core::Model::PatchDocument PatchHistoryState::takeRedoSnapshot()
    {
        auto next = mRedoStack.back();
        mRedoStack.pop_back();
        mUndoStack.push_back(mEngineConfig.getPatchDocument());
        return next;
    }

    // -------------------------------------------------------------------------
    // Command registration
    // -------------------------------------------------------------------------

    void RpcHistoryController::registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad) {
        dispatcher.registerHandler("getHistory",         [this](const juce::var& rid, const juce::var& p) { return handleGetHistory(rid, p); });
        dispatcher.registerHandler("undo",               [this, onLoad](const juce::var& rid, const juce::var& p) { return handleUndo(rid, p, onLoad); });
        dispatcher.registerHandler("redo",               [this, onLoad](const juce::var& rid, const juce::var& p) { return handleRedo(rid, p, onLoad); });
    }

    juce::var RpcHistoryController::handleUndo(const juce::var& requestId, const juce::var&, std::function<void()> onLoad) {
        if (!mHistory.canUndo())
            return createError("UNDO_ACK", requestId, "Nothing to undo");
        auto prev = mHistory.takeUndoSnapshot();
        mHistory.applyAndNotify(prev, onLoad);
        return createResponse("UNDO_ACK", requestId, {}, true);
    }

    juce::var RpcHistoryController::handleRedo(const juce::var& requestId, const juce::var&, std::function<void()> onLoad) {
        if (!mHistory.canRedo())
            return createError("REDO_ACK", requestId, "Nothing to redo");
        auto next = mHistory.takeRedoSnapshot();
        mHistory.applyAndNotify(next, onLoad);
        return createResponse("REDO_ACK", requestId, {}, true);
    }

    juce::var RpcHistoryController::handleGetHistory(const juce::var& requestId, const juce::var&) {
        return createError("HISTORY", requestId, "Version control deferred in Era 7 Aseptic Phase");
    }

} // namespace UI
} // namespace Omega
