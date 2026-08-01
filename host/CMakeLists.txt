cmake_minimum_required(VERSION 3.25.0)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)

project(OMEGA VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Force static linking for dependencies
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build static libraries" FORCE)

include(FetchContent)

# yaml-cpp
FetchContent_Declare(
    yaml-cpp
    GIT_REPOSITORY https://github.com/jbeder/yaml-cpp.git
    GIT_TAG 0.8.0
)

FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.4.0
)

# WAMR (WebAssembly Micro Runtime)
FetchContent_Declare(
    wamr
    GIT_REPOSITORY https://github.com/bytecodealliance/wasm-micro-runtime.git
    GIT_TAG WAMR-1.3.0
)

# WAMR Build Config (Standardized Phase 28.H)
set(WAMR_BUILD_INTERP 1)
set(WAMR_BUILD_AOT 0)
set(WAMR_BUILD_JIT 0)
set(WAMR_BUILD_LIBC_BUILTIN 1)
set(WAMR_BUILD_FAST_INTERP 1)
set(WAMR_BUILD_MULTI_MODULE 1)
set(WAMR_BUILD_TARGET "X86_64")
set(WAMR_BUILD_PLATFORM "windows")

# Global linkage macros to prevent DLL import/export issues (The "Pattern" Fix)
add_compile_definitions(WASM_RUNTIME_API_EXTERN=)
add_compile_definitions(COMPILING_WASM_RUNTIME_API=1)

FetchContent_MakeAvailable(yaml-cpp Catch2 wamr)


# WAMR Runtime Library Integration
set(WAMR_ROOT_DIR ${wamr_SOURCE_DIR})
include(${wamr_SOURCE_DIR}/build-scripts/runtime_lib.cmake)
add_library(vmlib ${WAMR_RUNTIME_LIB_SOURCE})
target_include_directories(vmlib PUBLIC 
    ${wamr_SOURCE_DIR}/core/iwasm/include
    ${wamr_SOURCE_DIR}/core/shared/utils
)


add_subdirectory(JUCE _juce)
include_directories(JUCE/modules)
include_directories(src/Core)
include_directories(src/Core/Ace)
include_directories(src/Core/Ace/Model)
include_directories(src/Core/Ace/Parser)
include_directories(src/Core/Ace/Loader)
include_directories(src/Core/Ace/Export)
include_directories(src/Core/Ace/Registry)
include_directories(src/Core/Ace/Validation)
include_directories(src/Core/Compiler)
include_directories(src/Core/Compiler/Graph)
include_directories(src/Core/Model)
include_directories(src/Core/Model/Patch)
include_directories(src/Core/Model/Parameters)
include_directories(src/Core/Model/Identifiers)
include_directories(src/Core/Modulation)
include_directories(src/Core/Modulation/Manifest)
include_directories(src/Core/Modulation/Metadata)
include_directories(src/Core/Modulation/Registry)
include_directories(src/Core/Modulation/Types)
include_directories(src/Core/Providers)
include_directories(src/Core/Providers/Semantic)
include_directories(src/Core/Providers/Telemetry)
include_directories(src/Core/Service)
include_directories(src/Core/Service/Config)
include_directories(src/Core/Service/Engine)
include_directories(src/Core/Util)
include_directories(src/Core/Util/Registry)
include_directories(src/Core/Util/Performance)
include_directories(src/Core/Voice/Plan)
include_directories(src/Core/Wasm)
include_directories(src/Core/Wasm/Host)
include_directories(src/Core/Wasm/Service)
include_directories(src/Engine)
include_directories(src/Engine/Voice)
include_directories(src/Engine/Modular)
include_directories(src/Engine/Modulation)
include_directories(src/Plugin)
include_directories(src/UI)
include_directories(src/UI/Bridge)
include_directories(src/UI/Editor)
include_directories(src/UI/Controllers/Base)
include_directories(src/UI/Controllers/Runtime)
include_directories(src/UI/Controllers/System)
include_directories(src/UI/Controllers/Library)
include_directories(src)

# Módulos OMEGA
add_subdirectory(src/Core)
add_subdirectory(src/Engine)
add_subdirectory(src/Plugin)

# Tests
include(CTest)
enable_testing()
add_subdirectory(src/Tests)
