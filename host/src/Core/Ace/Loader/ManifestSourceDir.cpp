#include "ManifestSourceDir.h"

#include "AceCatalog.h"
#include "AcePackLoader.h" // registerPortTelemetry
#include "AceManifestParser.h"
#include "AceContractJsonParser.h"
#include "ModulationTelemetryRegistry.h"
#include "WasmModuleService.h"
#include <yaml-cpp/yaml.h>

namespace Omega {
namespace Core {
namespace Ace {

    ManifestSourceDir::ManifestSourceDir(AceCatalog& catalog) : mCatalog(catalog) {}

    bool ManifestSourceDir::loadFromDirectory(const juce::File& directory) {
        if (!directory.isDirectory()) return false;

        juce::File asepticFile = directory.getChildFile(directory.getFileName() + ".acemm");
        juce::File legacyFile = directory.getChildFile(directory.getFileName() + ".yaml");
        juce::File wasmFile = directory.getChildFile(directory.getFileName() + ".wasm");
        
        juce::File targetFile = asepticFile.existsAsFile() ? asepticFile : legacyFile;

        if (targetFile.existsAsFile()) {
            try {
                YAML::Node root = YAML::LoadFile(targetFile.getFullPathName().toStdString());
                ComponentInfo info;
                AceManifestParser::parseComponentNode(root, info);
                AcePackLoader::registerPortTelemetry(info);
                
                info.sourcePath = directory.getFullPathName().toStdString();
                info.isPackaged = false;
                info.isCompliant = directory.getChildFile("AUDIT_REPORT.md").existsAsFile();

                // Hybrid Loading: WASM introspection
                if (wasmFile.existsAsFile()) {
                    std::string contract = Wasm::WasmModuleService::getInstance().getModuleContract(wasmFile.getFullPathName().toStdString());
                    if (!contract.empty()) {
                        ComponentInfo wasmInfo;
                        if (AceContractJsonParser::parseContractJson(contract, wasmInfo)) {
                            for (const auto& p : wasmInfo.parameters) {
                                auto it = std::find_if(info.parameters.begin(), info.parameters.end(), 
                                    [&](const ParameterDef& pd) { return pd.id == p.id; });
                                
                                if (it == info.parameters.end()) {
                                    info.parameters.push_back(p);
                                } else {
                                    it->min = p.min;
                                    it->max = p.max;
                                    it->defaultValue = p.defaultValue;
                                    it->unit = p.unit;
                                }
                                info.defaultParams[p.id] = p.defaultValue;
                            }
                            
                            for (const auto& port : wasmInfo.ports) {
                                auto it = std::find_if(info.ports.begin(), info.ports.end(), 
                                    [&](const Modulation::PortDescriptor& pd) { return pd.id == port.id; });
                                if (it == info.ports.end()) info.ports.push_back(port);
                            }

                            info.engine = "WASM";
                        }
                    }
                }

                mCatalog.registerComponent(info);
                return true;
            } catch (const std::exception& e) {
                juce::Logger::writeToLog("ACE ERROR: Failed to load manifest from " + targetFile.getFullPathName() + " : " + juce::String(e.what()));
            }
        }

        // Fallback: WASM self-description
        if (wasmFile.existsAsFile()) {
            std::string contract = Wasm::WasmModuleService::getInstance().getModuleContract(wasmFile.getFullPathName().toStdString());
            if (!contract.empty()) {
                ComponentInfo info;
                if (AceContractJsonParser::parseContractJson(contract, info)) {
                    info.sourcePath = directory.getFullPathName().toStdString();
                    info.isPackaged = false;
                    info.isCompliant = directory.getChildFile("AUDIT_REPORT.md").existsAsFile();
                    mCatalog.registerComponent(info);
                    return true;
                }
            }
        }

        return false;
    }

    bool ManifestSourceDir::loadFromModulesDirectory(const juce::File& modulesDir) {
        if (!modulesDir.isDirectory()) return false;
        int loadedCount = 0;
        juce::Array<juce::File> children;
        modulesDir.findChildFiles(children, juce::File::findDirectories, false);
        for (const auto& child : children) {
            if (loadFromDirectory(child)) loadedCount++;
        }
        return loadedCount > 0;
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
