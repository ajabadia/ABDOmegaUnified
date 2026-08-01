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
)
target_link_libraries(omega_core_tests PRIVATE ${OMEGA_TEST_COMMON_DEPS})

# --- UI serialization helper: VarSerialization ---
# Pure PatchDocument <-> juce::var helpers extracted from RpcPresetController
# (Fase 5.1). The test compiles the exact same translation unit.
add_executable(omega_ui_tests
    VarSerialization.test.cpp
    ../UI/Controllers/Library/VarSerialization.cpp
)
target_link_libraries(omega_ui_tests PRIVATE ${OMEGA_TEST_COMMON_DEPS} omega_engine)

# --- Plugin parameter layout builder: ParameterLayoutBuilder ---
# Builds the APVTS layout from the registry (Fase 5.3). Needs
# juce_audio_processors (ParameterLayout/AudioParameterFloat), which omega_core
# does not link, so it gets its own target.
add_executable(omega_plugin_tests
    ParameterLayoutBuilder.test.cpp
    ../Plugin/ParameterLayoutBuilder.cpp
)
target_link_libraries(omega_plugin_tests PRIVATE ${OMEGA_TEST_COMMON_DEPS} juce::juce_audio_processors)

add_test(NAME omega_core_tests COMMAND omega_core_tests)
add_test(NAME omega_ui_tests COMMAND omega_ui_tests)
add_test(NAME omega_plugin_tests COMMAND omega_plugin_tests)
