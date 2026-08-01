#include "AcePackLoader.h"
#include "AceCatalog.h"
#include "AceManifestParser.h"
#include "AceContractJsonParser.h"
#include "ModulationTelemetryRegistry.h"
#include "WasmModuleService.h"
#include <yaml-cpp/yaml.h>
#include <juce_cryptography/juce_cryptography.h>

namespace Omega {
namespace Core {
namespace Ace {

    AcePackLoader::AcePackLoader(AceCatalog& catalog) : mCatalog(catalog) {}

    bool AcePackLoader::loadFromDirectory(const juce::File& directory) {
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
                registerPortTelemetry(info);
                
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

    bool AcePackLoader::loadFromModulesDirectory(const juce::File& modulesDir) {
        if (!modulesDir.isDirectory()) return false;
        int loadedCount = 0;
        juce::Array<juce::File> children;
        modulesDir.findChildFiles(children, juce::File::findDirectories, false);
        for (const auto& child : children) {
            if (loadFromDirectory(child)) loadedCount++;
        }
        return loadedCount > 0;
    }

    bool AcePackLoader::loadFromAcePack(const juce::File& acePackFile) {
        if (!acePackFile.existsAsFile()) return false;
        juce::ZipFile zip(acePackFile);
        int loaded = 0;
        for (int i = 0; i < zip.getNumEntries(); ++i) {
            auto* entry = zip.getEntry(i);
            if (entry == nullptr) continue;
            juce::String name = entry->filename;
            if (name.endsWithIgnoreCase(".acemm") || name.endsWithIgnoreCase(".yaml")) {
                std::unique_ptr<juce::InputStream> stream(zip.createStreamForEntry(i));
                if (stream && loadFromArchive(*stream, name, acePackFile.getFullPathName())) {
                    loaded++;
                }
            }
        }
        return loaded > 0;
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
        try {
            juce::String yamlContent = archiveStream.readEntireStreamAsString();
            ComponentInfo info;
            info.manifestHash = juce::SHA256(yamlContent.toUTF8()).toHexString().toStdString();
            YAML::Node root = YAML::Load(yamlContent.toStdString());
            AceManifestParser::parseComponentNode(root, info);
            registerPortTelemetry(info);
            info.sourcePath = fullSourcePath.toStdString();
            info.isPackaged = true;

            juce::File zipFile(fullSourcePath);
            juce::ZipFile zip(zipFile);
            for (int i = 0; i < zip.getNumEntries(); ++i) {
                if (juce::String(zip.getEntry(i)->filename).containsIgnoreCase("AUDIT_REPORT.md")) {
                    info.isCompliant = true;
                    break;
                }
            }
            mCatalog.registerComponent(info);
            return true;
        } catch (const std::exception& e) {
            juce::Logger::writeToLog("ACE ERROR: Failed to load manifest from archive entry " + sourceName + " : " + juce::String(e.what()));
            return false;
        }
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
