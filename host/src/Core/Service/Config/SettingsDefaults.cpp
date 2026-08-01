#include "SettingsDefaults.h"

#include <juce_core/juce_core.h>
#include <yaml-cpp/yaml.h>

namespace Omega::Core::Service {

    std::vector<SettingDef> SettingsDefaults::loadDefaults() {
        std::vector<SettingDef> defs = loadHardcodedDefaults();
        mergeYamlMetadata(defs);
        return defs;
    }

    std::vector<SettingDef> SettingsDefaults::loadHardcodedDefaults() {
        std::vector<SettingDef> defs;

        SettingDef voices;
        voices.id = "polyphony";
        voices.label = "Polyphony (Voices)";
        voices.defaultValue = 8.0f;
        voices.minValue = 1.0f;
        voices.maxValue = 32.0f;
        voices.isInteger = true;
        voices.category = "ENGINE";
        defs.push_back(voices);

        SettingDef tempo;
        tempo.id = "default_tempo";
        tempo.label = "Default Tempo (BPM)";
        tempo.defaultValue = 120.0f;
        tempo.minValue = 40.0f;
        tempo.maxValue = 300.0f;
        tempo.isInteger = true;
        tempo.category = "GENERAL";
        defs.push_back(tempo);

        // --- Era 7.2.3 Global Lighting Governance ---
        SettingDef shadowAngle;
        shadowAngle.id = "rackShadowAngle";
        shadowAngle.label = "Global Shadow Angle";
        shadowAngle.defaultValue = 135.0f;
        shadowAngle.minValue = 0.0f;
        shadowAngle.maxValue = 360.0f;
        shadowAngle.category = "PHYSICS";
        defs.push_back(shadowAngle);

        SettingDef shadowDistance;
        shadowDistance.id = "rackShadowDistance";
        shadowDistance.label = "Global Shadow Distance";
        shadowDistance.defaultValue = 4.0f;
        shadowDistance.minValue = 0.0f;
        shadowDistance.maxValue = 20.0f;
        shadowDistance.category = "PHYSICS";
        defs.push_back(shadowDistance);

        SettingDef shadowBlur;
        shadowBlur.id = "rackShadowBlur";
        shadowBlur.label = "Global Shadow Blur";
        shadowBlur.defaultValue = 4.0f;
        shadowBlur.minValue = 0.0f;
        shadowBlur.maxValue = 20.0f;
        shadowBlur.category = "PHYSICS";
        defs.push_back(shadowBlur);

        return defs;
    }

    void SettingsDefaults::mergeYamlMetadata(std::vector<SettingDef>& defs) {
        // --- 2. Load Metadata from YAML (Externalized) ---
        juce::File exeFile = juce::File::getSpecialLocation(juce::File::currentExecutableFile);
        juce::File yamlFile = exeFile.getSiblingFile("Resources").getChildFile("system_settings.yaml");

        // Fallback for Debug builds (if Resources is in root)
        if (!yamlFile.exists()) {
            yamlFile = juce::File("d:/desarrollos/ABDOmega/Resources/system_settings.yaml");
        }

        if (!yamlFile.existsAsFile()) return;

        try {
            YAML::Node root = YAML::LoadFile(yamlFile.getFullPathName().toStdString());
            if (root["settings"] && root["settings"].IsSequence()) {
                for (auto const& s : root["settings"]) {
                    SettingDef def;
                    def.id = s["id"].as<std::string>();
                    def.label = s["label"].as<std::string>();
                    def.tooltip = s["tooltip"].as<std::string>("");
                    def.defaultValue = s["defaultValue"].as<float>(0.0f);
                    def.minValue = s["minValue"].as<float>(0.0f);
                    def.maxValue = s["maxValue"].as<float>(1.0f);
                    def.isInteger = s["isInteger"].as<bool>(false);
                    def.category = s["category"].as<std::string>("GENERAL");

                    if (s["options"] && s["options"].IsMap()) {
                        for (auto const& it : s["options"]) {
                            def.options[it.first.as<int>()] = it.second.as<std::string>();
                        }
                    }
                    defs.push_back(def);
                }
            }
        } catch (...) {
            // Silently fallback to hardcoded
        }
    }

} // namespace Omega::Core::Service
