#pragma once

#include <juce_core/juce_core.h>
#include <atomic>
#include <map>
#include <string>

#include "SettingsRepository.h"

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
        /**
         * [P0-1] Techo de polifonía del engine: tamaño del array de voces
         * (VirtualAnalogEngine::mVoices). Fuente única del límite: el setting
         * "numVoices" (YAML + fallback hardcodeado) y getNumVoices() clampean
         * contra esta constante, nunca contra literales sueltos.
         */
        static constexpr int kMaxVoices = 16;

        SystemSettingsManager();
        ~SystemSettingsManager() = default;

        // --- Gestión de Parámetros ---
        void registerSetting(const SettingDef& def);
        float getSettingValue(const std::string& id) const;
        void setSettingValue(const std::string& id, float value);
        
        const SettingDef* getSettingDef(const std::string& id) const;
        const std::map<std::string, SettingDef>& getAllSettings() const { return mDefs; }
        std::map<std::string, float> getCurrentValues() const { return mValues; }

        // --- Persistencia (delegada a SettingsRepository) ---
        void resetToDefaults();

        // --- Helpers de Acceso Rápido ---
        /**
         * [P0-1] Clamp puro de la polifonía al techo del engine (kMaxVoices).
         * Expuesto estático para poder testearlo sin instanciar el manager
         * (sin tocar disco/settings.xml) — ver SettingsPolyphony.test.cpp.
         */
        static int clampNumVoices(int requested) noexcept {
            return juce::jlimit(1, kMaxVoices, requested);
        }

        /**
         * [P0-1] Polifonía activa, clampeada al array de voces del engine
         * (kMaxVoices). Un valor persistido inválido (fuera de rango o ausente)
         * nunca puede pedir más voces de las que existen en el array.
         */
        int getNumVoices() const {
            return clampNumVoices((int)getSettingValue("numVoices"));
        }

    private:
        std::map<std::string, SettingDef> mDefs;
        std::map<std::string, float> mValues;

        SettingsRepository mRepository;
    };

} // namespace Omega::Core::Service
