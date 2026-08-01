#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include <functional>
#include "RpcBaseController.h"
#include "RpcHistoryController.h"

namespace Omega {
    namespace Core {
        namespace Ace { class AceCatalog; }
    }

namespace UI {

    /**
     * @brief Controller for preset CRUD operations (Era 7).
     * Rack mutations live in RpcRackController; undo/redo in RpcHistoryController.
     */
    class RpcPresetController : public RpcBaseController {
    public:
        RpcPresetController(Core::Ace::AceCatalog& catalog, PatchHistoryState& history)
            : mCatalog(catalog), mHistory(history) {}

        juce::var handleListAceComponents(const juce::var& requestId, const juce::var& payload);
        juce::var handleLoadPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleNewPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleSavePreset(const juce::var& requestId, const juce::var& payload);
        juce::var handleListPresets(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetBrowserData(const juce::var& requestId, const juce::var& payload);

        void registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad);

    private:
        Core::Ace::AceCatalog& mCatalog;
        PatchHistoryState& mHistory;
    };

} // namespace UI
} // namespace Omega
