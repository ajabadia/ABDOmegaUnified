# ------------------------------------------------------------------------------
# Build configuration for omega_core (Static Library)
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Source Gathering (Recursively)
# ------------------------------------------------------------------------------
file(GLOB_RECURSE OMEGA_CORE_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    *.cpp *.h
)

# Exclude tool source from main library to avoid duplicate main()
list(REMOVE_ITEM OMEGA_CORE_SOURCES "Ace/omega-schema-tool.cpp")


# ------------------------------------------------------------------------------
# Library Definition
# ------------------------------------------------------------------------------
add_library(omega_core STATIC ${OMEGA_CORE_SOURCES})

# ------------------------------------------------------------------------------
# Include Paths
# ------------------------------------------------------------------------------
target_include_directories(omega_core 
    PUBLIC 
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/Ace
        ${CMAKE_CURRENT_SOURCE_DIR}/Ace/Model
        ${CMAKE_CURRENT_SOURCE_DIR}/Ace/Parser
        ${CMAKE_CURRENT_SOURCE_DIR}/Ace/Loader
        ${CMAKE_CURRENT_SOURCE_DIR}/Ace/Export
        ${CMAKE_CURRENT_SOURCE_DIR}/Ace/Registry
        ${CMAKE_CURRENT_SOURCE_DIR}/Ace/Validation
        ${CMAKE_CURRENT_SOURCE_DIR}/Providers
        ${CMAKE_CURRENT_SOURCE_DIR}/Service/Config
        ${CMAKE_CURRENT_SOURCE_DIR}/Providers/Telemetry
        ${CMAKE_CURRENT_SOURCE_DIR}/Providers/Semantic
        ${CMAKE_CURRENT_SOURCE_DIR}/Providers/Routing
        ${CMAKE_CURRENT_SOURCE_DIR}/Service
        ${CMAKE_CURRENT_SOURCE_DIR}/Service/Engine
        ${CMAKE_CURRENT_SOURCE_DIR}/Modulation
        ${CMAKE_CURRENT_SOURCE_DIR}/Modulation/Types
        ${CMAKE_CURRENT_SOURCE_DIR}/Modulation/Manifest
        ${CMAKE_CURRENT_SOURCE_DIR}/Modulation/Registry
        ${CMAKE_CURRENT_SOURCE_DIR}/Modulation/Metadata
        ${CMAKE_CURRENT_SOURCE_DIR}/Voice
        ${CMAKE_CURRENT_SOURCE_DIR}/Voice/Plan
        ${CMAKE_CURRENT_SOURCE_DIR}/Wasm
        ${CMAKE_CURRENT_SOURCE_DIR}/Wasm/Host
        ${CMAKE_CURRENT_SOURCE_DIR}/Wasm/Service
        ${CMAKE_CURRENT_SOURCE_DIR}/Compiler
        ${CMAKE_CURRENT_SOURCE_DIR}/Compiler/Orchestration
        ${CMAKE_CURRENT_SOURCE_DIR}/Compiler/Graph
        ${CMAKE_CURRENT_SOURCE_DIR}/Input
        ${CMAKE_CURRENT_SOURCE_DIR}/Input/Midi
        ${CMAKE_CURRENT_SOURCE_DIR}/Input/Manager
        ${CMAKE_CURRENT_SOURCE_DIR}/Util
        ${CMAKE_CURRENT_SOURCE_DIR}/Util/Performance
        ${CMAKE_CURRENT_SOURCE_DIR}/Util/Registry
        ${CMAKE_CURRENT_SOURCE_DIR}/Model
        ${CMAKE_CURRENT_SOURCE_DIR}/Model/Parameters
        ${CMAKE_CURRENT_SOURCE_DIR}/Model/Identifiers
        ${CMAKE_CURRENT_SOURCE_DIR}/Model/Patch
        ${CMAKE_CURRENT_SOURCE_DIR}/Model/Runtime
)

# Shared define: every TU that includes JuceHeader.h before the module headers
# needs JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED. Used by omega_core and the
# omega-schema-tool target (single point of truth).
set(OMEGA_JUCE_SETTINGS_DEFINE JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1)

target_compile_definitions(omega_core
    PRIVATE
        ${OMEGA_JUCE_SETTINGS_DEFINE}
)

# ------------------------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------------------------
target_link_libraries(omega_core 
    PUBLIC 
        yaml-cpp
        vmlib
        juce::juce_core
        juce::juce_cryptography
        juce::juce_data_structures
        juce::juce_audio_basics
)

# ------------------------------------------------------------------------------
# Schema Tool Executable (VEM-169)
# ------------------------------------------------------------------------------
add_executable(omega-schema-tool Ace/omega-schema-tool.cpp)
target_link_libraries(omega-schema-tool PRIVATE omega_core juce::juce_core juce::juce_events)
target_compile_definitions(omega-schema-tool PRIVATE ${OMEGA_JUCE_SETTINGS_DEFINE})
