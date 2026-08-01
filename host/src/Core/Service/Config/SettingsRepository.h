#pragma once

#include <juce_core/juce_core.h>
#include <map>
#include <set>
#include <string>

namespace Omega::Core::Service {

    /**
     * @brief Persistencia de los ajustes globales de OMEGA.
     * [Fase 5.5]: extraído de SystemSettingsManager — separa la E/S
     * (YAML path + XML load/save) de la lógica de negocio.
     * Guarda en %AppData%/ABD/OMEGA/settings.xml
     */
    class SettingsRepository {
    public:
        static juce::File getSettingsFile();

        /** Recarga los valores persistidos para los ids conocidos. */
        void load(const std::set<std::string>& knownIds,
                  std::map<std::string, float>& values) const;

        void save(const std::map<std::string, float>& values) const;
    };

} // namespace Omega::Core::Service
