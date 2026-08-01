#include "SystemSettingsManager.h"

#include <set>

#include "SettingsDefaults.h"

namespace Omega::Core::Service {

    SystemSettingsManager::SystemSettingsManager() {
        for (const auto& def : SettingsDefaults::loadDefaults()) {
            registerSetting(def);
        }

        std::set<std::string> knownIds;
        for (const auto& [id, def] : mDefs) knownIds.insert(id);
        mRepository.load(knownIds, mValues);
    }

    void SystemSettingsManager::registerSetting(const SettingDef& def) {
        mDefs[def.id] = def;
        if (mValues.find(def.id) == mValues.end()) {
            mValues[def.id] = def.defaultValue;
        }
    }

    float SystemSettingsManager::getSettingValue(const std::string& id) const {
        auto it = mValues.find(id);
        if (it != mValues.end()) return it->second;
        
        auto defIt = mDefs.find(id);
        if (defIt != mDefs.end()) return defIt->second.defaultValue;
        
        return 0.0f;
    }

    void SystemSettingsManager::setSettingValue(const std::string& id, float value) {
        auto defIt = mDefs.find(id);
        if (defIt == mDefs.end()) return;
        
        float oldVal = getSettingValue(id);
        mValues[id] = juce::jlimit(defIt->second.minValue, defIt->second.maxValue, value);
        
        if (oldVal != mValues[id]) {
            juce::Logger::writeToLog("[SystemSettings] Updating " + juce::String(id) + ": " + juce::String(oldVal) + " -> " + juce::String(mValues[id]));
        }
        
        mRepository.save(mValues);
    }

    const SettingDef* SystemSettingsManager::getSettingDef(const std::string& id) const {
        auto it = mDefs.find(id);
        if (it != mDefs.end()) return &it->second;
        return nullptr;
    }

    void SystemSettingsManager::resetToDefaults() {
        for (auto const& [id, def] : mDefs) {
            mValues[id] = def.defaultValue;
        }
        mRepository.save(mValues);
    }

} // namespace Omega::Core::Service
