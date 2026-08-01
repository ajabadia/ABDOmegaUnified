#include "ModulationTelemetryRegistry.h"

namespace Omega::Core::Providers {

    ModulationTelemetryRegistry& ModulationTelemetryRegistry::getInstance() {
        static ModulationTelemetryRegistry instance;
        return instance;
    }

    int ModulationTelemetryRegistry::registerPin(const std::string& componentId, const std::string& pinId, TelemetryType type, const std::string& label) {
        int idx = mNextIndex++;
        mPins[idx] = { idx, componentId + "." + pinId, label, type };
        return idx;
    }

    int ModulationTelemetryRegistry::getPinIndex(const std::string& id) const {
        for (const auto& [idx, pin] : mPins) {
            if (pin.id == id) return idx;
        }
        return -1;
    }

    std::vector<TelemetryPin> ModulationTelemetryRegistry::getActivePins() const {
        std::vector<TelemetryPin> pins;
        for (const auto& [idx, pin] : mPins) {
            pins.push_back(pin);
        }
        return pins;
    }

} // namespace Omega::Core::Providers
