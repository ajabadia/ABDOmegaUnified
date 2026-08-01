#include "AceCatalog.h"
#include "../Validation/AceValidator.h"
#include "../Parser/AceManifestParser.h"
#include "../Loader/AcePackLoader.h"
#include "../Export/AceContractExporter.h"
#include <juce_core/juce_core.h>
#include <iostream>

namespace Omega {
namespace Core {
namespace Ace {

    AceCatalog::AceCatalog() {}

    void AceCatalog::registerComponent(const ComponentInfo& info) {
        if (info.id.empty()) {
            juce::Logger::writeToLog("ACE ERROR: Attempted to register component with empty ID");
            return;
        }

        // [ERA 7]: Strict Aseptic Validation
        AceValidator sheriff(*this);
        auto report = sheriff.validateManifest(info);

        if (report.status == ValidationStatus::Invalid) {
            std::cerr << "[ACE WARNING] Module '" << info.id << "' has validation errors but was loaded anyway (Permissive Mode)." << std::endl;
            for (const auto& issue : report.issues) {
                std::cerr << "  - [" << issue.code << "] " << issue.message << std::endl;
            }
            mComponents[info.id] = info;
            return;
        }

        if (report.status == ValidationStatus::Degraded) {
            std::cout << "[ACE WARNING] Module '" << info.id << "' loaded with degraded status." << std::endl;
        }

        mComponents[info.id] = info;
    }

    const ComponentInfo* AceCatalog::getComponent(const std::string& id) const {
        auto it = mComponents.find(id);
        if (it != mComponents.end()) return &it->second;
        return nullptr;
    }

    std::vector<const ComponentInfo*> AceCatalog::listByFamilyAndEngine(const std::string& family, const std::string& engine) const {
        std::vector<const ComponentInfo*> results;
        for (auto const& [id, info] : mComponents) {
            if (info.family == family && info.engine == engine) results.push_back(&info);
        }
        return results;
    }

    std::vector<const ComponentInfo*> AceCatalog::getComponents() const {
        std::vector<const ComponentInfo*> results;
        for (auto const& [id, info] : mComponents) results.push_back(&info);
        return results;
    }

    std::vector<const ComponentInfo*> AceCatalog::findComponents(const std::string& query) const {
        std::vector<const ComponentInfo*> results;
        if (query.empty()) return getComponents();

        juce::String jquery(query);
        for (auto const& [id, info] : mComponents) {
            bool match = false;
            if (juce::String(info.id).containsIgnoreCase(jquery)) match = true;
            else if (juce::String(info.name).containsIgnoreCase(jquery)) match = true;
            else if (juce::String(info.modelId).containsIgnoreCase(jquery)) match = true;
            else {
                for (auto const& tag : info.tags) {
                    if (juce::String(tag).containsIgnoreCase(jquery)) {
                        match = true;
                        break;
                    }
                }
            }
            if (match) results.push_back(&info);
        }
        return results;
    }

    std::string AceCatalog::getFallbackId(const std::string& family, const std::string& engine) const {
        return "";
    }

    void AceCatalog::buildFallbacks() {}

    bool AceCatalog::loadFromDirectory(const juce::File& directory) {
        AcePackLoader loader(*this);
        return loader.loadFromDirectory(directory);
    }

    bool AceCatalog::loadFromModulesDirectory(const juce::File& modulesDir) {
        AcePackLoader loader(*this);
        return loader.loadFromModulesDirectory(modulesDir);
    }

    bool AceCatalog::loadFromAcePack(const juce::File& acePackFile) {
        AcePackLoader loader(*this);
        return loader.loadFromAcePack(acePackFile);
    }

    juce::var AceCatalog::exportComponentContract(const std::string& id) const {
        auto* info = getComponent(id);
        if (!info) return juce::var();
        return AceContractExporter::exportComponentContract(*info, *this);
    }

    void AceCatalog::exportAllContracts(const juce::File& outputDir) const {
        if (!outputDir.exists()) outputDir.createDirectory();
        for (const auto& [id, info] : mComponents) {
            juce::var contract = exportComponentContract(id);
            juce::String json = juce::JSON::toString(contract, false);
            juce::File outFile = outputDir.getChildFile(juce::String(id) + ".contract.json");
            outFile.replaceWithText(json);
        }
    }

    juce::var AceCatalog::generateSchema() const {
        return AceContractExporter::generateSchema();
    }

    std::unique_ptr<juce::InputStream> AceCatalog::getResourceStream(const std::string& componentId, const std::string& resourcePath) const {
        auto* info = getComponent(componentId);
        if (!info) return nullptr;

        juce::File source(info->sourcePath);
        if (info->isPackaged) {
            if (!source.existsAsFile()) return nullptr;
            auto zip = std::make_unique<juce::ZipFile>(source);
            for (int i = 0; i < zip->getNumEntries(); ++i) {
                if (juce::String(zip->getEntry(i)->filename).endsWithIgnoreCase(resourcePath)) {
                    return std::unique_ptr<juce::InputStream>(zip->createStreamForEntry(i));
                }
            }
        } else {
            juce::File resFile = source.getChildFile(resourcePath);
            if (resFile.existsAsFile()) return resFile.createInputStream();
        }
        return nullptr;
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
