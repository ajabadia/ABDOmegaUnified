#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include <functional>
#include "RpcBaseController.h"
#include "RpcHistoryController.h"
#include "PatchRepository.h"

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
        /**
         * @param repoDir Directorio de persistencia de patches. Si se omite,
         *        PatchRepository usa %AppData%/ABDOmega/patches (defaultDir).
         *        Inyectable para tests (directorio temporal).
         */
        RpcPresetController(Core::Ace::AceCatalog& catalog, PatchHistoryState& history, juce::File repoDir = juce::File())
            : mCatalog(catalog), mHistory(history), mRepository(repoDir) {}

        juce::var handleListAceComponents(const juce::var& requestId, const juce::var& payload);
        juce::var handleLoadPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleNewPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleSavePreset(const juce::var& requestId, const juce::var& payload);
        juce::var handleSaveCurrentPatch(const juce::var& requestId, const juce::var& payload);
        juce::var handleListPresets(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetBrowserData(const juce::var& requestId, const juce::var& payload);
        juce::var handleDeletePreset(const juce::var& requestId, const juce::var& payload);

        void registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad);

        /** @brief Acceso al repositorio (tests). */
        Persistence::PatchRepository& repository() { return mRepository; }

    private:
        Core::Ace::AceCatalog& mCatalog;
        PatchHistoryState& mHistory;
        Persistence::PatchRepository mRepository;
    };

} // namespace UI
} // namespace Omega
