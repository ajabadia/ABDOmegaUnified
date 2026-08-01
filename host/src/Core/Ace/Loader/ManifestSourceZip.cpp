#include "ManifestSourceZip.h"

#include "AceCatalog.h"
#include "AcePackLoader.h" // registerPortTelemetry
#include "AceManifestParser.h"
#include "ModulationTelemetryRegistry.h"
#include <yaml-cpp/yaml.h>
#include <juce_cryptography/juce_cryptography.h>

namespace Omega {
namespace Core {
namespace Ace {

    ManifestSourceZip::ManifestSourceZip(AceCatalog& catalog) : mCatalog(catalog) {}

    bool ManifestSourceZip::loadFromArchive(juce::InputStream& archiveStream,
                                            const juce::String& sourceName,
                                            const juce::String& fullSourcePath) {
        try {
            juce::String yamlContent = archiveStream.readEntireStreamAsString();
            ComponentInfo info;
            info.manifestHash = juce::SHA256(yamlContent.toUTF8()).toHexString().toStdString();
            YAML::Node root = YAML::Load(yamlContent.toStdString());
            AceManifestParser::parseComponentNode(root, info);
            AcePackLoader::registerPortTelemetry(info);
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
