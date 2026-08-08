/**
 * [P1-2] Resolución de system_settings.yaml sin rutas absolutas hardcodeadas.
 *
 * Diagnóstico original: SettingsDefaults.cpp tenía un fallback legacy
 * `juce::File("d:/desarrollos/ABDOmega/Resources/system_settings.yaml")` — ruta
 * absoluta de un proyecto que ya no existe (ABDOmegaUnified). El fallback
 * silencioso devolvía defaults hardcodeados SIN la metadata YAML (labels,
 * tooltips, opciones de numVoices) en cualquier máquina/checkout distinto.
 *
 * Este test fija la invariante: resolveSystemSettingsYaml() resuelve por
 * walk-up desde el exe (patrón del catálogo en prepareToPlay) y cae a cwd como
 * último recurso. Nunca hay una ruta absoluta en el código.
 */
#include <catch2/catch_test_macros.hpp>

#include "SettingsDefaults.h"

using namespace Omega::Core::Service;

namespace {

    /** RAII: directorio temporal único por test. */
    struct TempDir {
        juce::File dir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                             .getChildFile("omega_yaml_res_" + juce::Uuid().toString().substring(0, 12));

        TempDir() { dir.createDirectory(); }
        ~TempDir() { dir.deleteRecursively(); }
    };

    /** Simula el layout de release: exe anidado, Resources en la raíz del repo. */
    juce::File makeReleaseTree(const juce::File& root) {
        juce::File exeDir = root.getChildFile("build/src/Plugin/omega_plugin_artefacts/Release");
        exeDir.createDirectory();
        return exeDir.getChildFile("omega_plugin.exe");
    }

} // namespace

TEST_CASE("resolución walk-up: encuentra Resources/system_settings.yaml en un ancestro del exe", "[settings][yaml][p1-2]") {
    TempDir tmp;

    // Layout realista: Resources en la raíz, exe a 5 niveles de profundidad.
    juce::File resourcesDir = tmp.dir.getChildFile("Resources");
    resourcesDir.createDirectory();
    juce::File yaml = resourcesDir.getChildFile("system_settings.yaml");
    yaml.replaceWithText("settings: []");

    const juce::File exeFile = makeReleaseTree(tmp.dir);
    const juce::File resolved = SettingsDefaults::resolveSystemSettingsYaml(exeFile, tmp.dir);

    REQUIRE(resolved.existsAsFile());
    REQUIRE(resolved == yaml);
}

TEST_CASE("resolución junto al exe: Resources hermano del exe también vale", "[settings][yaml][p1-2]") {
    TempDir tmp;

    juce::File exeDir = tmp.dir.getChildFile("app");
    exeDir.createDirectory();
    juce::File yaml = exeDir.getChildFile("Resources").getChildFile("system_settings.yaml");
    yaml.getParentDirectory().createDirectory();
    yaml.replaceWithText("settings: []");

    const juce::File resolved = SettingsDefaults::resolveSystemSettingsYaml(exeDir.getChildFile("app.exe"), tmp.dir);

    REQUIRE(resolved.existsAsFile());
    REQUIRE(resolved == yaml);
}

TEST_CASE("cwd como último recurso cuando el exe no tiene Resources en ningún ancestro", "[settings][yaml][p1-2]") {
    TempDir tmp;

    // Exe en un árbol SIN Resources (p. ej. desplegado suelto en un DAW).
    juce::File orphanExeDir = tmp.dir.getChildFile("orphan");
    orphanExeDir.createDirectory();
    const juce::File exeFile = orphanExeDir.getChildFile("omega_plugin.exe");

    // cwd con el YAML (build lanzado desde la raíz del repo).
    juce::File cwdDir = tmp.dir.getChildFile("cwd");
    cwdDir.createDirectory();
    juce::File yaml = cwdDir.getChildFile("Resources").getChildFile("system_settings.yaml");
    yaml.getParentDirectory().createDirectory();
    yaml.replaceWithText("settings: []");

    const juce::File resolved = SettingsDefaults::resolveSystemSettingsYaml(exeFile, cwdDir);

    REQUIRE(resolved.existsAsFile());
    REQUIRE(resolved == yaml);
}

TEST_CASE("sin YAML en ningún sitio → File vacío (caller usa defaults hardcoded)", "[settings][yaml][p1-2]") {
    TempDir tmp;

    juce::File exeDir = tmp.dir.getChildFile("bare");
    exeDir.createDirectory();
    const juce::File exeFile = exeDir.getChildFile("omega_plugin.exe");

    const juce::File resolved = SettingsDefaults::resolveSystemSettingsYaml(exeFile, tmp.dir);

    REQUIRE_FALSE(resolved.existsAsFile());
    REQUIRE(resolved.getFullPathName().isEmpty());
}
