# ------------------------------------------------------------------------------
# Catch2 unit tests for pure C++ functions (REFACTORING_PLAN Fase 5)
# ------------------------------------------------------------------------------

# Common deps shared by every Catch2 target (single point of truth: if the
# framework or the core linkage changes, update it once).
set(OMEGA_TEST_COMMON_DEPS omega_core Catch2::Catch2WithMain)

# --- Core-level pure functions: parser helpers + exporter builders ---
add_executable(omega_core_tests
    AceManifestParser.test.cpp
    AceContractExporter.test.cpp
    GlobalFxTarget.test.cpp
    SettingsPolyphony.test.cpp
    SettingsYamlResolution.test.cpp
    CompilerHardcodings.test.cpp
    PatchCableSync.test.cpp
    MidiBridge.test.cpp
)
target_link_libraries(omega_core_tests PRIVATE ${OMEGA_TEST_COMMON_DEPS})

# --- UI serialization helper: VarSerialization + PatchRepository (P0-3) ---
# Pure PatchDocument <-> juce::var helpers extracted from RpcPresetController
# (Fase 5.1) + persistencia de patches a disco (P0-3). Los tests compilan los
# TUs exactos de VarSerialization, PatchRepository y los controllers de presets
# (RpcPresetController/RpcHistoryController) para ejercitar la integración RPC
# contra un directorio temporal.
add_executable(omega_ui_tests
    VarSerialization.test.cpp
    PatchRepository.test.cpp
    PresetPersistence.test.cpp
    ../UI/Controllers/Library/RpcPresetController.cpp
    ../UI/Controllers/Library/RpcHistoryController.cpp
    ../UI/Controllers/Library/VarSerialization.cpp
    ../UI/Persistence/PatchRepository.cpp
)
target_link_libraries(omega_ui_tests PRIVATE ${OMEGA_TEST_COMMON_DEPS} omega_engine)
target_include_directories(omega_ui_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../UI/Controllers/Base)

# --- Plugin parameter layout builder: ParameterLayoutBuilder ---
# Builds the APVTS layout from the registry (Fase 5.3). Needs
# juce_audio_processors (ParameterLayout/AudioParameterFloat), which omega_core
# does not link, so it gets its own target.
add_executable(omega_plugin_tests
    ParameterLayoutBuilder.test.cpp
    TailLength.test.cpp
    ../Plugin/ParameterLayoutBuilder.cpp
)
target_link_libraries(omega_plugin_tests PRIVATE ${OMEGA_TEST_COMMON_DEPS} juce::juce_audio_processors)

# --- Engine/Config semantic routing: EngineConfigManager ---
# Verifies the string-overload updateParameter("layer.a.cutoff", ...) used by
# the plugin timer resolves semantic keys to (module, catalog slot) and reaches
# the compiled snapshot. Needs omega_engine (VirtualAnalogEngine) + omega_core.
#
# --- P1-1: guard de recompilación ---
# SnapshotRecompileGuard.test.cpp verifica que un valor idéntico no recompila
# el snapshot y que el modo lote del timer (beginBatch/endBatch) recompila una
# sola vez sin perder cambios.
add_executable(omega_engine_tests
    EngineConfigSemanticRouting.test.cpp
    SnapshotRecompileGuard.test.cpp
)
target_link_libraries(omega_engine_tests PRIVATE ${OMEGA_TEST_COMMON_DEPS} omega_engine)

add_test(NAME omega_core_tests COMMAND omega_core_tests)
add_test(NAME omega_ui_tests COMMAND omega_ui_tests)
add_test(NAME omega_plugin_tests COMMAND omega_plugin_tests)
add_test(NAME omega_engine_tests COMMAND omega_engine_tests)
