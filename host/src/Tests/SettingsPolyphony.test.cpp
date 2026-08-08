/**
 * [P0-1] Regresión de la polifonía dinámica: ID único + límites + clamp.
 *
 * Diagnóstico original: el engine usa un array fijo de 16 voces
 * (VirtualAnalogEngine::mVoices / mVoiceStates) y el setting canónico es
 * "numVoices" (system_settings.yaml: default 16, min 1, max 16; expuesto en la
 * UI web calibration-data.ts). Sin embargo SettingsDefaults.cpp registraba un
 * DUPLICADO legacy "polyphony" (default 8, max 32) cuyo ID no coincide con el
 * que lee el engine → trampa latente de out-of-bounds y, sin YAML, un fallback
 * que devolvía 0 voces (silencio).
 *
 * Este test fija la invariante: el único ID es "numVoices", su max coincide
 * con SystemSettingsManager::kMaxVoices (16) y clampNumVoices acota cualquier
 * valor al rango [1, kMaxVoices].
 */
#include <catch2/catch_test_macros.hpp>

#include "SettingsDefaults.h"
#include "SystemSettingsManager.h"

using namespace Omega::Core::Service;

namespace {

    const SettingDef* findSetting(const std::vector<SettingDef>& defs, const std::string& id) {
        for (const auto& d : defs)
            if (d.id == id) return &d;
        return nullptr;
    }

} // namespace

TEST_CASE("numVoices es el único setting de polifonía (sin duplicado legacy polyphony)", "[polyphony][settings]") {
    // Test hermético sobre el fallback hardcodeado (puro, sin E/S ni YAML del
    // entorno) — es el que fija la invariante del ID canónico. loadDefaults()
    // (hardcoded + merge YAML) se usa como smoke secundario en el test del max.
    const auto hardcoded = SettingsDefaults::loadHardcodedDefaults();

    REQUIRE(findSetting(hardcoded, "numVoices") != nullptr);
    REQUIRE(findSetting(hardcoded, "polyphony") == nullptr);
}

TEST_CASE("el max de numVoices coincide con kMaxVoices (tamaño del array de voces)", "[polyphony][settings]") {
    // Smoke sobre loadDefaults() completo (hardcoded + merge YAML): el YAML del
    // repo define numVoices max 16, igual que el fallback hardcodeado.
    const auto all = SettingsDefaults::loadDefaults();
    const SettingDef* numVoices = findSetting(all, "numVoices");
    REQUIRE(numVoices != nullptr);
    REQUIRE(findSetting(all, "polyphony") == nullptr);

    // El techo del setting no puede pedir más voces de las que existen
    REQUIRE(numVoices->maxValue == SystemSettingsManager::kMaxVoices);
    // El default debe ser válido en el rango
    REQUIRE(numVoices->defaultValue >= numVoices->minValue);
    REQUIRE(numVoices->defaultValue <= numVoices->maxValue);
    REQUIRE(numVoices->isInteger);
}

TEST_CASE("clampNumVoices acota cualquier valor al rango [1, kMaxVoices]", "[polyphony][settings]") {
    REQUIRE(SystemSettingsManager::clampNumVoices(0) == 1);
    REQUIRE(SystemSettingsManager::clampNumVoices(-5) == 1);
    REQUIRE(SystemSettingsManager::clampNumVoices(1) == 1);
    REQUIRE(SystemSettingsManager::clampNumVoices(8) == 8);
    REQUIRE(SystemSettingsManager::clampNumVoices(16) == SystemSettingsManager::kMaxVoices);
    REQUIRE(SystemSettingsManager::clampNumVoices(32) == SystemSettingsManager::kMaxVoices);
    REQUIRE(SystemSettingsManager::clampNumVoices(1000) == SystemSettingsManager::kMaxVoices);
}
