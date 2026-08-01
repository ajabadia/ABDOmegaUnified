#pragma once

#include <juce_core/juce_core.h>
#include <atomic>
#include <map>
#include <string>

namespace Omega::Core::Service {

    /**
     * @brief Estructura para un parámetro de configuración del sistema.
     */
    struct SettingDef {
        std::string id;
        std::string label;
        std::string tooltip;
        float defaultValue = 0.0f;
        float minValue = 0.0f;
        float maxValue = 1.0f;
        bool isInteger = false;
        std::string category = "GENERAL";
        std::map<int, std::string> options; // Para selectores (id -> label)
    };

    /**
     * @brief Manager central para los ajustes globales de OMEGA (no presets).
     * [Persistence]: Guarda en %AppData%/ABD/OMEGA/settings.xml
     */
    class SystemSettingsManager {
    public:
        SystemSettingsManager();
        ~SystemSettingsManager() = default;

        // --- Gestión de Parámetros ---
        void registerSetting(const SettingDef& def);
        float getSettingValue(const std::string& id) const;
        void setSettingValue(const std::string& id, float value);
        
        const SettingDef* getSettingDef(const std::string& id) const;
        const std::map<std::string, SettingDef>& getAllSettings() const { return mDefs; }
        std::map<std::string, float> getCurrentValues() const { return mValues; }

        // --- Persistencia ---
        void load();
        void save();
        void resetToDefaults();

        // --- Helpers de Acceso Rápido ---
        int getNumVoices() const { return (int)getSettingValue("numVoices"); }

    private:
        std::map<std::string, SettingDef> mDefs;
        std::map<std::string, float> mValues;
        
        juce::File getSettingsFile();
        void initializeDefaults();
    };

} // namespace Omega::Core::Service
