#include "SettingsRepository.h"

namespace Omega::Core::Service {

    juce::File SettingsRepository::getSettingsFile() {
        juce::File appData = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
                            .getChildFile("ABD")
                            .getChildFile("OMEGA");

        if (!appData.exists()) appData.createDirectory();
        return appData.getChildFile("settings.xml");
    }

    void SettingsRepository::load(const std::set<std::string>& knownIds,
                                  std::map<std::string, float>& values) const {
        juce::File file = getSettingsFile();
        if (!file.exists()) return;

        auto xml = juce::XmlDocument::parse(file);
        if (xml == nullptr) return;

        if (xml->hasTagName("OMEGA_SETTINGS")) {
            for (auto* e : xml->getChildIterator()) {
                if (e->hasTagName("SETTING")) {
                    std::string id = e->getStringAttribute("id").toStdString();
                    float val = (float)e->getDoubleAttribute("value");
                    if (knownIds.find(id) != knownIds.end()) {
                        values[id] = val;
                    }
                }
            }
        }
    }

    void SettingsRepository::save(const std::map<std::string, float>& values) const {
        juce::File file = getSettingsFile();
        juce::XmlElement xml("OMEGA_SETTINGS");

        for (auto const& [id, val] : values) {
            auto* e = xml.createNewChildElement("SETTING");
            e->setAttribute("id", id);
            e->setAttribute("value", (double)val);
        }

        xml.writeTo(file);
    }

} // namespace Omega::Core::Service
