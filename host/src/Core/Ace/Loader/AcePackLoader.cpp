#include "AcePackLoader.h"

#include "ModulationTelemetryRegistry.h"

namespace Omega {
namespace Core {
namespace Ace {

    AcePackLoader::AcePackLoader(AceCatalog& catalog)
        : mCatalog(catalog), mDir(catalog), mAcePack(catalog), mZip(catalog) {}

    bool AcePackLoader::loadFromDirectory(const juce::File& directory) {
        return mDir.loadFromDirectory(directory);
    }

    bool AcePackLoader::loadFromModulesDirectory(const juce::File& modulesDir) {
        return mDir.loadFromModulesDirectory(modulesDir);
    }

    bool AcePackLoader::loadFromAcePack(const juce::File& acePackFile) {
        return mAcePack.loadFromAcePack(acePackFile);
    }

    void AcePackLoader::registerPortTelemetry(ComponentInfo& info) {
        auto& reg = Providers::ModulationTelemetryRegistry::getInstance();
        for (auto& port : info.ports) {
            // Match the original parser side-effect: register outputs and
            // audio inputs (audio inputs are visualizable on the rack).
            if (port.isInput && port.type != Modulation::ModPortType::Audio) continue;

            Providers::TelemetryType tType = (port.type == Modulation::ModPortType::Audio)
                ? Providers::TelemetryType::Audio : Providers::TelemetryType::Discrete;
            port.telemetryIndex = reg.registerPin(info.id, port.id, tType, port.label);
        }
    }

    bool AcePackLoader::loadFromArchive(juce::InputStream& archiveStream, const juce::String& sourceName, const juce::String& fullSourcePath) {
        return mZip.loadFromArchive(archiveStream, sourceName, fullSourcePath);
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
