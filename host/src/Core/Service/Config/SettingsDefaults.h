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

        /** Fallback hardcodeado (sin merge YAML). Público para tests herméticos:
         *  verifica la invariante del ID canónico sin depender de la ruta YAML
         *  del entorno (SettingsPolyphony.test.cpp). Función pura, sin E/S. */
        static std::vector<SettingDef> loadHardcodedDefaults();

        /**
         * [P1-2] Resuelve system_settings.yaml SIN rutas absolutas hardcodeadas:
         *  busca hacia arriba desde el directorio del exe (Resources/ en cada
         *  ancestro, patrón del catálogo en prepareToPlay — max 15 niveles) y,
         *  si no lo encuentra, cae a cwd/Resources. Devuelve un File vacío si
         *  no hay YAML en ningún sitio (el caller usa los defaults hardcoded).
         *  Pública y con parámetros explícitos (exe + cwd) para tests herméticos
         *  que simulan la estructura de directorios sin depender del entorno.
         */
        static juce::File resolveSystemSettingsYaml(const juce::File& exeFile, const juce::File& cwd);

    private:
        static void mergeYamlMetadata(std::vector<SettingDef>& defs);
    };

} // namespace Omega::Core::Service
