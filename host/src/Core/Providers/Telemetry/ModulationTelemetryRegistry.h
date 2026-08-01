#pragma once

#include <string>
#include <vector>
#include <map>

namespace Omega::Core::Providers {

    enum class TelemetryType {
        Audio,
        CV,
        Discrete
    };

    struct TelemetryPin {
        int index;
        std::string id;
        std::string label;
        TelemetryType type;
    };

    /**
     * @brief Registry for telemetry slots.
     * Manages the mapping between semantic component pins and physical hub indices.
     */
    class ModulationTelemetryRegistry {
    public:
        static ModulationTelemetryRegistry& getInstance();

        int registerPin(const std::string& componentId, const std::string& pinId, TelemetryType type, const std::string& label);
        
        int getPinIndex(const std::string& id) const;
        std::vector<TelemetryPin> getActivePins() const;

        const std::map<int, TelemetryPin>& getRegisteredPins() const { return mPins; }

    private:
        ModulationTelemetryRegistry() = default;
        std::map<int, TelemetryPin> mPins;
        int mNextIndex = 0;
    };

} // namespace Omega::Core::Providers
