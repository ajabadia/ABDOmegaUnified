#pragma once

#include <juce_core/juce_core.h>
#include <set>
#include <mutex>
#include "RpcBaseController.h"
#include "RpcCommandDispatcher.h"
#include "ModulationTelemetryHub.h"
#include "ModulationTelemetryRegistry.h"
#include "SystemSettingsManager.h"

namespace Omega {
namespace UI {

    /**
     * @brief Controller for Telemetry and Real-Time Visualization.
     * Era 6 - Multi-Tier Push Model Implementation.
     */
    class RpcTelemetryController : public RpcBaseController {
    public:
        RpcTelemetryController(Core::Service::SystemSettingsManager& settings) : mSettings(settings) {}

        void registerCommands(RpcCommandDispatcher& dispatcher, juce::var& scopeState);

        /**
         * @brief Collects telemetry data based on current subscriptions and tier.
         * @param includeStreaming If true, includes high-bandwidth history buffers (Scopes).
         */
        juce::var collectTelemetry(bool includeStreaming);

        // --- HANDLERS ---
        juce::var handleSubscribeTelemetry(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetTelemetry(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetTelemetrySources(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetModConnections(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetScopeState(const juce::var& requestId, const juce::var& payload, const juce::var& currentScopeState);
        juce::var handleSetScopeState(const juce::var& requestId, const juce::var& payload, juce::var& targetScopeState);

    private:
        Core::Service::SystemSettingsManager& mSettings;
        
        std::mutex mSubscriptionMutex;
        std::set<std::string> mDiscretePins;   // Low-bandwidth (Latest/Peak)
        std::set<std::string> mStreamingPins;  // High-bandwidth (History/Buffer)
    };

} // namespace UI
} // namespace Omega
