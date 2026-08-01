#include "SemanticBrokerService.h"
#include "ModuleManifest.h"
#include "OmegaIdentifiers.h"
#include "PatchIdentifiers.h"
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include <algorithm>
#include <functional>
#include <map>

namespace Omega {
namespace Core {
namespace Service {

    void SemanticBrokerService::rebuildInventory(const Model::PatchDocument& doc) {
        std::lock_guard<std::mutex> lock(this->mMutex);
        this->mInventory.clear();

        for (const auto& mod : doc.modules) {
            // [Era 7] Improved naming: Use component name + instance ID for clarity
            std::string componentId = Model::mapTypeToId(mod.typeId);
            std::string friendlyName = componentId;
            
            Modulation::ModuleManifest manifest;
            manifest.status = mod.flags.bypassed ? "bypass" : "active";
            manifest.author = "OMEGA Era 7";
            
            // Resolve component info from catalog
            if (mCatalog) {
                auto info = mCatalog->getComponent(componentId);
                if (info) {
                    manifest.modelId = info->id;
                    manifest.category = info->family;
                    friendlyName = info->name;
                    
                    // Map Ports (Era 7 Aseptic Logic)
                    for (const auto& port : info->ports) {
                        Modulation::PortDescriptor pd;
                        pd.id = port.id;
                        pd.label = port.label;
                        pd.isInput = port.isInput;
                        pd.telemetryIndex = port.telemetryIndex;
                        pd.type = port.type;
                        
                        manifest.ports.push_back(pd);
                    }
                }
            }

            std::string instanceIdStr = friendlyName + " (" + std::to_string(mod.instanceId) + ")";
            manifest.instanceId = instanceIdStr;
            mInventory[instanceIdStr] = manifest;
        }

        // [Era 7 Aseptic] Global ghost sources (addStandardMidiSources) removed.
        // Modulation must flow from real module instances in the rack.
    }

    std::vector<Modulation::ModuleManifest> SemanticBrokerService::getInventory() const {
        std::lock_guard<std::mutex> lock(this->mMutex);
        std::vector<Modulation::ModuleManifest> results;
        for (auto const& pair : this->mInventory) results.push_back(pair.second);
        return results;
    }

    const Modulation::ModuleManifest* SemanticBrokerService::getManifest(const std::string& instanceId) const {
        std::lock_guard<std::mutex> lock(this->mMutex);
        auto it = this->mInventory.find(instanceId);
        return (it != this->mInventory.end()) ? &(it->second) : nullptr;
    }

} // namespace Service
} // namespace Core
} // namespace Omega
