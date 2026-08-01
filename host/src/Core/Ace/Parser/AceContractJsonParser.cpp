#include "AceContractJsonParser.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Ace {

    bool AceContractJsonParser::parseContractJson(const std::string& json, ComponentInfo& info) {
        juce::var data = juce::JSON::parse(json);
        if (data.isUndefined()) return false;

        info.id = data["id"].toString().toStdString();
        info.name = data["name"].toString().toStdString();
        info.engine = "WASM";
        info.family = data.getProperty("family", "utility").toString().toStdString();
        
        if (data.hasProperty("parameters")) {
            auto* params = data["parameters"].getArray();
            if (params) {
                for (int i = 0; i < params->size(); ++i) {
                    auto p = (*params)[i];
                    ParameterDef pdef;
                    pdef.id = p["id"].toString().toStdString();
                    pdef.label = p["label"].toString().toStdString();
                    pdef.min = (float)p["min"];
                    pdef.max = (float)p["max"];
                    pdef.defaultValue = (float)p["default"];
                    pdef.unit = p["unit"].toString().toStdString();
                    
                    pdef.modulable = true;
                    pdef.front = true;
                    pdef.back = true;
                    
                    info.parameters.push_back(pdef);
                    info.defaultParams[pdef.id] = pdef.defaultValue;

                    Modulation::PortDescriptor port;
                    port.id = pdef.id;
                    port.label = pdef.label;
                    port.type = Modulation::ModPortType::CV;
                    port.isInput = true;
                    port.telemetryIndex = -1;
                    port.defaultValue = pdef.defaultValue;
                    info.ports.push_back(port);
                }
            }
        }

        return !info.id.empty();
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
