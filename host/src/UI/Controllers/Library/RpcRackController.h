#pragma once

#include <juce_core/juce_core.h>
#include <functional>
#include "RpcBaseController.h"
#include "RpcHistoryController.h"

namespace Omega {
    namespace Core {
        namespace Ace { class AceCatalog; }
    }

namespace UI {

    /**
     * @brief Controller for rack mutation commands (add/remove/move/clear).
     * Extracted from RpcPresetController (Fase 5.1).
     */
    class RpcRackController : public RpcBaseController {
    public:
        RpcRackController(Core::Ace::AceCatalog& catalog, PatchHistoryState& history)
            : mCatalog(catalog), mHistory(history) {}

        void registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad);

        juce::var handleAddModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleRemoveModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleMoveModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleClearRack(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);

    private:
        Core::Ace::AceCatalog& mCatalog;
        PatchHistoryState& mHistory;
    };

} // namespace UI
} // namespace Omega
