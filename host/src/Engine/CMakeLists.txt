# ------------------------------------------------------------------------------
# Build configuration for omega_engine (Static Library)
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Source Gathering (Recursively)
# ------------------------------------------------------------------------------
file(GLOB_RECURSE OMEGA_ENGINE_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    *.cpp *.h
)

# ------------------------------------------------------------------------------
# Library Definition
# ------------------------------------------------------------------------------
add_library(omega_engine STATIC ${OMEGA_ENGINE_SOURCES})

# ------------------------------------------------------------------------------
# Include Paths
# ------------------------------------------------------------------------------
target_include_directories(omega_engine 
    PUBLIC 
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/Voice
        ${CMAKE_CURRENT_SOURCE_DIR}/Modulation
        ${CMAKE_CURRENT_SOURCE_DIR}/Modular
)

target_compile_definitions(omega_engine
    PRIVATE
        JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1
)

# ------------------------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------------------------
target_link_libraries(omega_engine 
    PUBLIC 
        omega_core
        juce::juce_audio_basics
        juce::juce_audio_processors
)
