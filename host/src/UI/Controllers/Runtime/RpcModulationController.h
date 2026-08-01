#pragma once

#include "RpcBaseController.h"
#include "RpcCommandDispatcher.h"
#include "ModulationDescriptors.h"
#include <functional>

namespace Omega {
    namespace Core {
        namespace Service { class EngineConfigManager; }
    }

namespace UI {

    /**
     * @brief Controller for Modulation Matrix operations (Era 7).
     * Decoupled from legacy preset state.
     */
    class RpcModulationController : public RpcBaseController {
    public:
        RpcModulationController(Core::Service::EngineConfigManager& engineConfig) 
            : mEngineConfig(engineConfig) {}

        juce::var handleGetModulationMetadata(const juce::var& requestId, const juce::var& payload);
        juce::var handleUpdatePatchbayMatrixSlot(const juce::var& requestId, const juce::var& payload);

        void registerCommands(RpcCommandDispatcher& dispatcher);

        void setOnMatrixChangedCallback(std::function<void()> callback) { mOnMatrixChanged = std::move(callback); }

    private:
        Core::Service::EngineConfigManager& mEngineConfig;
        std::function<void()> mOnMatrixChanged;

        static constexpr int kMaxMatrixSlots = 64;
    };

} // namespace UI
} // namespace Omega
