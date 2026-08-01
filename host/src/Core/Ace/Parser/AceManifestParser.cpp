#include "AceManifestParser.h"
#include "YAMLHelpers.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Ace {

    void AceManifestParser::parseComponentNode(const YAML::Node& componentNode, ComponentInfo& info) {
        try {
            info.id = componentNode["id"].as<std::string>();
            info.version = YamlHelpers::safeAsInt(componentNode["version"], 7); // Era 7 default
            
            // Legacy Compatibility Initialization
            info.modelId = componentNode["modelId"].IsDefined() ? componentNode["modelId"].as<std::string>() : info.id;
            info.implementationId = (uint32_t)YamlHelpers::safeAsInt(componentNode["implementationId"], 0);

            // ERA 7 MANDATORY BLOCKS
            const YAML::Node metadata = componentNode["metadata"];
            const YAML::Node ui = componentNode["ui"];

            if (!metadata.IsDefined()) {
                juce::Logger::writeToLog("ACE ERROR: Module '" + juce::String(info.id) + "' is missing mandatory 'metadata' block (Era 7).");
                return; 
            }

            // 1. Metadata Extraction
            info.name = metadata["name"].IsDefined() ? metadata["name"].as<std::string>() : info.id;
            info.family = metadata["family"].IsDefined() ? metadata["family"].as<std::string>() : "utility";
            info.description = metadata["description"].IsDefined() ? metadata["description"].as<std::string>() : "";
            
            if (metadata["rack"].IsDefined()) {
                const YAML::Node rack = metadata["rack"];
                info.hp = YamlHelpers::safeAsInt(rack["hp"], 0);
                if (rack["slot"].IsDefined()) info.rack = rack["slot"].as<std::string>();
            }

            if (metadata["tags"].IsDefined() && metadata["tags"].IsSequence()) {
                for (auto t : metadata["tags"]) info.tags.push_back(t.as<std::string>());
            }

            if (metadata["governance"].IsDefined()) {
                const YAML::Node gov = metadata["governance"];
                info.registryRole = gov["registry_role"].IsDefined() ? gov["registry_role"].as<std::string>() : "";
                info.vendorId = gov["vendor_id"].IsDefined() ? gov["vendor_id"].as<std::string>() : "";
            }

            // 2. Engine Logic
            if (componentNode["engine"].IsDefined()) {
                info.engine = componentNode["engine"].as<std::string>();
            } else {
                info.engine = "Modular";
            }

            // 3. UI Block Parsing
            if (ui.IsDefined()) {
                info.uiSkin = ui["skin"].IsDefined() ? ui["skin"].as<std::string>() : "industrial";
                
                if (ui["dimensions"].IsDefined()) {
                    info.uiWidth = YamlHelpers::safeAsFloat(ui["dimensions"]["width"], 0);
                    info.uiHeight = YamlHelpers::safeAsFloat(ui["dimensions"]["height"], 0);
                }

                if (ui["lighting"].IsDefined()) {
                    const auto& light = ui["lighting"];
                    info.lighting.shadowAngle = YamlHelpers::safeAsFloat(light["shadowAngle"], 135.0f);
                    info.lighting.distance = YamlHelpers::safeAsFloat(light["distance"], 4.0f);
                    info.lighting.blur = YamlHelpers::safeAsFloat(light["blur"], 4.0f);
                    if (light["shadowColor"].IsDefined()) {
                        info.lighting.shadowColor = light["shadowColor"].as<std::string>();
                    }
                }

                if (ui["colors"].IsDefined() && ui["colors"].IsMap()) {
                    for (auto it = ui["colors"].begin(); it != ui["colors"].end(); ++it) {
                        info.uiColors[it->first.as<std::string>()] = it->second.as<std::string>();
                    }
                }

                if (ui["typography"].IsDefined() && ui["typography"].IsMap()) {
                    for (auto it = ui["typography"].begin(); it != ui["typography"].end(); ++it) {
                        info.uiTypography[it->first.as<std::string>()] = it->second.as<std::string>();
                    }
                }

                if (ui["faceplate"].IsDefined()) {
                    info.faceplateAsset = ui["faceplate"].as<std::string>();
                }

                // 3.1 Layout & Containers (Era 7.2)
                if (ui["layout"].IsDefined()) {
                    const auto& layout = ui["layout"];
                    info.gridSnap = YamlHelpers::safeAsInt(layout["gridSnap"], 5);
                    
                    if (layout["containers"].IsDefined() && layout["containers"].IsSequence()) {
                        for (auto c : layout["containers"]) {
                            LayoutContainer container;
                            container.id = c["id"].as<std::string>();
                            container.label = c["label"].IsDefined() ? c["label"].as<std::string>() : container.id;
                            
                            if (c["pos"].IsDefined()) {
                                container.x = YamlHelpers::safeAsFloat(c["pos"]["x"], 0);
                                container.y = YamlHelpers::safeAsFloat(c["pos"]["y"], 0);
                            }
                            
                            if (c["size"].IsDefined()) {
                                container.width = c["size"]["w"].as<std::string>();
                                container.height = YamlHelpers::safeAsFloat(c["size"]["h"], 0);
                            }
                            
                            container.variant = c["variant"].IsDefined() ? c["variant"].as<std::string>() : "default";
                            container.tab = c["tab"].IsDefined() ? c["tab"].as<std::string>() : "";
                            container.zIndex = YamlHelpers::safeAsInt(c["zIndex"], 0);
                            container.labelPosition = c["labelPosition"].IsDefined() ? c["labelPosition"].as<std::string>() : "top";
                            
                            info.uiContainers.push_back(container);
                        }
                    }
                }

                // Controls -> Parameters & Input Ports
                if (ui["controls"].IsDefined() && ui["controls"].IsSequence()) {
                    for (auto c : ui["controls"]) {
                        UIItem item = parseEntryNode(c, info);
                        info.uiControls.push_back(item);
                    }
                }

                // Jacks -> Communication Ports
                if (ui["jacks"].IsDefined() && ui["jacks"].IsSequence()) {
                    for (auto j : ui["jacks"]) {
                        UIItem item = parseEntryNode(j, info);
                        info.uiJacks.push_back(item);
                    }
                }
            }

            // 4. Resources Block (Era 7.2.3)
            if (componentNode["resources"].IsDefined()) {
                const auto& res = componentNode["resources"];
                if (res["assets"].IsDefined() && res["assets"].IsSequence()) {
                    // Logic to register assets into a local VFS if needed.
                }
            }

        } catch (const std::exception& parseEx) {
            juce::Logger::writeToLog("ACE ERROR: Critical parse error in Era 7 module '" + juce::String(info.id) + "': " + juce::String(parseEx.what()));
        }
    }

    UIItem AceManifestParser::parseEntryNode(const YAML::Node& entryNode, ComponentInfo& info) {
        UIItem ui;
        try {
            if (!entryNode["bind"].IsDefined()) return ui;
            
            std::string bindId = entryNode["bind"].as<std::string>();
            std::string label = entryNode["label"].IsDefined() ? entryNode["label"].as<std::string>() : bindId;
            std::string typeStr = entryNode["type"].IsDefined() ? entryNode["type"].as<std::string>() : "port";
            float defVal = YamlHelpers::safeAsFloat(entryNode["default"], 0.0f);

            ui.bind = bindId;
            ui.label = label;
            ui.type = typeStr;

            // 1. Visual Metadata (Era 7)
            if (entryNode["pos"].IsDefined()) {
                ui.x = YamlHelpers::safeAsFloat(entryNode["pos"]["x"], 0);
                ui.y = YamlHelpers::safeAsFloat(entryNode["pos"]["y"], 0);
            }

            if (entryNode["presentation"].IsDefined()) {
                const auto& pres = entryNode["presentation"];
                ui.tab = pres["tab"].IsDefined() ? pres["tab"].as<std::string>() : "";
                ui.container = pres["container"].IsDefined() ? pres["container"].as<std::string>() : "";
                ui.group = pres["group"].IsDefined() ? pres["group"].as<std::string>() : "";
                
                // Fallback for Era 7.2 engine parity
                if (ui.container.empty() && !ui.group.empty()) {
                    ui.container = ui.group;
                }

                ui.component = pres["component"].IsDefined() ? pres["component"].as<std::string>() : "";
                ui.variant = pres["variant"].IsDefined() ? pres["variant"].as<std::string>() : "";
                ui.height = YamlHelpers::safeAsFloat(pres["height"], 0); // [NEW] Era 7.2.3 Shadow Physics

                if (pres["attachments"].IsDefined() && pres["attachments"].IsSequence()) {
                    for (auto a : pres["attachments"]) {
                        Attachment att;
                        att.type = a["type"].IsDefined() ? a["type"].as<std::string>() : "label";
                        att.position = a["position"].IsDefined() ? a["position"].as<std::string>() : "top";
                        att.bind = a["bind"].IsDefined() ? a["bind"].as<std::string>() : "";
                        att.text = a["text"].IsDefined() ? a["text"].as<std::string>() : "";
                        att.variant = a["variant"].IsDefined() ? a["variant"].as<std::string>() : "";
                        att.offset = YamlHelpers::safeAsFloat(a["offset"], 0);
                        ui.attachments.push_back(att);
                    }
                }
            }

            // 2. Logic Registration
            if (typeStr == "control" || typeStr == "knob" || typeStr == "slider" || typeStr == "switch") {
                ParameterDef pdef;
                pdef.id = bindId;
                pdef.label = label;
                pdef.defaultValue = defVal;
                
                if (entryNode["range"].IsDefined()) {
                    pdef.min = YamlHelpers::safeAsFloat(entryNode["range"]["min"], 0.0f);
                    pdef.max = YamlHelpers::safeAsFloat(entryNode["range"]["max"], 1.0f);
                    pdef.defaultValue = YamlHelpers::safeAsFloat(entryNode["range"]["default"], defVal);
                }
                
                info.parameters.push_back(pdef);
                info.defaultParams[bindId] = pdef.defaultValue;
            }

            // Communication Ports
            bool isJack = (typeStr == "port" || typeStr == "jack");
            bool isModulable = (typeStr != "display" && typeStr != "led");

            if (isJack || isModulable) {
                Modulation::ModPortType portType = Modulation::ModPortType::CV;
                std::string signal = entryNode["signal"].IsDefined() ? entryNode["signal"].as<std::string>() : "cv";
                if (signal == "audio") portType = Modulation::ModPortType::Audio;
                else if (signal == "midi") portType = Modulation::ModPortType::MIDI;
                else if (signal == "gate" || signal == "trigger") portType = Modulation::ModPortType::Gate;

                bool isInput = true;
                if (entryNode["direction"].IsDefined()) {
                    isInput = (entryNode["direction"].as<std::string>() == "input");
                } else if (bindId.find("out") != std::string::npos) {
                    isInput = false;
                }

                // NOTE: Telemetry registration is a LOADER side-effect (Fase 5.2).
                // The parser stays pure and always emits telemetryIndex = -1;
                // AcePackLoader::registerPortTelemetry fills it after parsing.
                info.ports.push_back({bindId, label, portType, isInput, -1, defVal});
            }
        } catch (...) {}
        return ui;
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
