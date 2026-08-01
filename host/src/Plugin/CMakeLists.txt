file(GLOB_RECURSE OMEGA_PLUGIN_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    *.cpp *.h
)

file(GLOB_RECURSE OMEGA_UI_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    ../UI/*.cpp ../UI/*.h
)

juce_add_plugin(omega_plugin
    COMPANY_NAME "ABD-IA"
    BUNDLE_ID    "com.abd-ia.omega"
    IS_SYNTH     TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE
    PLUGIN_MANUFACTURER_CODE ABDI
    PLUGIN_CODE Ome1
    FORMATS Standalone VST3
    VST3_CAN_REPLACE_VST2 FALSE
    PRODUCT_NAME "OMEGA Synth"
    NEEDS_WEBVIEW2 TRUE
)

# ======================================================================
# EMBEDDED WEB UI (self-contained standalone)
# ----------------------------------------------------------------------
# The standalone previously served its interface from a hardcoded disk
# path ("d:\\desarrollos\\ABDOmega\\ui") that no longer exists. The runtime
# files are now staged from ABDOmegaUnified/host/ui at build time, packed
# into a ZIP and embedded in the binary via juce_add_binary_data. The
# WebView resource provider (OmegaWebViewComponent.h) serves every request
# from memory, so the exe is fully self-contained.
# ======================================================================
set(OMEGA_UI_EMBED_ZIP "${CMAKE_CURRENT_BINARY_DIR}/omega_ui_embedded.zip")
set(OMEGA_UI_STAGE_DIR "${CMAKE_CURRENT_BINARY_DIR}/omega_ui_stage")

# Collect every staged input so any UI change regenerates the embedded zip.
# CONFIGURE_DEPENDS re-runs the globs on every build and picks up new files
# (added CSS/assets/fonts) without a manual reconfigure.
# NOTE: the web UI lives at host/ui (two levels up from src/Plugin) — NOT at
# src/UI (which is the C++ editor code; on Windows both are case-insensitive
# aliases, so using ../ui here would silently point at the wrong directory).
file(GLOB CONFIGURE_DEPENDS OMEGA_UI_STAGE_ENTRY   "${CMAKE_CURRENT_SOURCE_DIR}/../../ui/index.html" "${CMAKE_CURRENT_SOURCE_DIR}/../../ui/bundle.js")
file(GLOB CONFIGURE_DEPENDS OMEGA_UI_STAGE_CSS     "${CMAKE_CURRENT_SOURCE_DIR}/../../ui/css/*" "${CMAKE_CURRENT_SOURCE_DIR}/../../ui/css/*/*")
file(GLOB CONFIGURE_DEPENDS OMEGA_UI_STAGE_ASSETS  "${CMAKE_CURRENT_SOURCE_DIR}/../../ui/assets/*" "${CMAKE_CURRENT_SOURCE_DIR}/../../ui/assets/*/*")
file(GLOB CONFIGURE_DEPENDS OMEGA_UI_STAGE_CORE    "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/index.css"
                                   "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/tokens/*"
                                   "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/layout/*"
                                   "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/primitives/*"
                                   "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/typography/*")
file(GLOB CONFIGURE_DEPENDS OMEGA_UI_STAGE_FONTS   "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/typography/fonts/Inter/*"
                                   "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/typography/fonts/Outfit/*"
                                   "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/typography/fonts/SevenSegment.ttf"
                                   "${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core/typography/fonts/microgrammanormal.ttf")

# Single source of truth for the stage-script invocation: both the configure-time
# execute_process and the build-time add_custom_command run ui_stage.cmake with
# the same arguments. Whole-argument quoting ("-DKEY=value" as one element, no
# inner quotes) is required so MSBuild does not mangle the -D values.
set(OMEGA_UI_STAGE_ARGS
    "-DUI_SRC=${CMAKE_CURRENT_SOURCE_DIR}/../../ui"
    "-DCORE_SRC=${CMAKE_CURRENT_SOURCE_DIR}/../../../web/src/omega-ui-core"
    "-DSTAGE_DIR=${OMEGA_UI_STAGE_DIR}"
    "-DZIP_OUT=${OMEGA_UI_EMBED_ZIP}"
    "-P" "${CMAKE_CURRENT_SOURCE_DIR}/ui_stage.cmake"
)

# The stage script must ALSO run at configure time: juce_add_binary_data reads
# the zip below at configure to emit UiData.cpp, so a pristine build tree (no
# prior build artifacts) would otherwise fail the chicken-and-egg. Eagerly
# generating it here makes clean checkouts/CI deterministic.
execute_process(
    COMMAND "${CMAKE_COMMAND}" ${OMEGA_UI_STAGE_ARGS}
    RESULT_VARIABLE _ui_stage_configure_result
)
if (NOT _ui_stage_configure_result EQUAL 0)
    message(FATAL_ERROR "Failed to stage embedded Web UI at configure time")
endif()

add_custom_command(
    OUTPUT "${OMEGA_UI_EMBED_ZIP}"
    COMMAND "${CMAKE_COMMAND}" ${OMEGA_UI_STAGE_ARGS}
    DEPENDS
        ${OMEGA_UI_STAGE_ENTRY}
        ${OMEGA_UI_STAGE_CSS}
        ${OMEGA_UI_STAGE_ASSETS}
        ${OMEGA_UI_STAGE_CORE}
        ${OMEGA_UI_STAGE_FONTS}
    COMMENT "Staging embedded Web UI -> omega_ui_embedded.zip"
    VERBATIM
)

juce_add_binary_data(omega_ui_embedded
    NAMESPACE  UiData
    HEADER_NAME UiData.h
    SOURCES    "${OMEGA_UI_EMBED_ZIP}"
)

# Deterministic include path for the generated UiData.h header
# (juce_binarydata_<target>/JuceLibraryCode) — independent of JUCE's own
# PUBLIC include-dir propagation.
target_include_directories(omega_ui_embedded
    PUBLIC "${CMAKE_CURRENT_BINARY_DIR}/juce_binarydata_omega_ui_embedded/JuceLibraryCode"
)

target_sources(omega_plugin
    PRIVATE
        ${OMEGA_PLUGIN_SOURCES}
        ${OMEGA_UI_SOURCES}
)

target_link_libraries(omega_plugin
    PRIVATE
        juce::juce_audio_utils
        juce::juce_gui_extra
        omega_core
        omega_engine
        vmlib
        omega_ui_embedded
)

target_compile_definitions(omega_plugin
    PRIVATE
        JUCE_USE_WIN_WEBVIEW2=1
        JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_IGNORE_VST3_MISMATCHED_PARAMETER_ID_WARNING=1
)
