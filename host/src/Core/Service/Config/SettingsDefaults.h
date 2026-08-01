#pragma once

#include <vector>

#include "SystemSettingsManager.h" // for SettingDef

namespace Omega::Core::Service {

    /**
     * @brief Fuente única de defaults de configuración del sistema.
     * [Fase 5.5]: extraído de SystemSettingsManager — combina los defaults
     * fail-safe hardcodeados con la metadata externalizada en
     * system_settings.yaml (cuando existe).
     */
    class SettingsDefaults {
    public:
        /** Defaults fail-safe + merge de metadata YAML (los YAML con id duplicado
         *  sobreescriben la definición pero no el valor ya registrado). */
        static std::vector<SettingDef> loadDefaults();

    private:
        static std::vector<SettingDef> loadHardcodedDefaults();
        static void mergeYamlMetadata(std::vector<SettingDef>& defs);
    };

} // namespace Omega::Core::Service
