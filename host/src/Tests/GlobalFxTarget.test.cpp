/**
 * Tests for the pure `globalFx.<id>` target parser (Era 7.2.3).
 *
 * Frontend wire convention (GlobalFxStrip.ts):
 *   dispatch({ type: 'setParameter', payload: { target: `globalFx.${id}`, value } })
 * with id = ParamId 200-204 (Mix/Feedback/Time/Speed/Intensity).
 *
 * The helper lives in PatchIdentifiers.h so both the RPC handler and these
 * tests share the exact same parsing logic.
 */
#include <catch2/catch_test_macros.hpp>

#include "Core/Model/Patch/PatchIdentifiers.h"

using namespace Omega::Core::Model;

TEST_CASE("getGlobalFxParamId parses the known wire IDs", "[globalFx][parse]") {
    REQUIRE(getGlobalFxParamId("globalFx.200") == ParamId::Mix);
    REQUIRE(getGlobalFxParamId("globalFx.201") == ParamId::Feedback);
    REQUIRE(getGlobalFxParamId("globalFx.202") == ParamId::Time);
    REQUIRE(getGlobalFxParamId("globalFx.203") == ParamId::Speed);
    REQUIRE(getGlobalFxParamId("globalFx.204") == ParamId::Intensity);
}

TEST_CASE("getGlobalFxParamId rejects out-of-range or malformed targets", "[globalFx][parse]") {
    // IDs fuera del rango FX global
    REQUIRE(getGlobalFxParamId("globalFx.199") == ParamId::None);
    REQUIRE(getGlobalFxParamId("globalFx.205") == ParamId::None);
    REQUIRE(getGlobalFxParamId("globalFx.0") == ParamId::None);

    // Prefijo incorrecto o ausente
    REQUIRE(getGlobalFxParamId("globalFx.200a") == ParamId::None); // sufijo no numérico
    REQUIRE(getGlobalFxParamId("GlobalFx.200") == ParamId::None);  // case-sensitive
    REQUIRE(getGlobalFxParamId("globalFx.") == ParamId::None);     // sin sufijo
    REQUIRE(getGlobalFxParamId("fx.200") == ParamId::None);        // prefijo distinto
    REQUIRE(getGlobalFxParamId("") == ParamId::None);              // vacío

    // Targets de módulo NO deben caer en el rango FX
    REQUIRE(getGlobalFxParamId("osc_va_basic.freq") == ParamId::None);
    REQUIRE(getGlobalFxParamId("masterGainDb") == ParamId::None);
}

TEST_CASE("isGlobalFxParamId bounds the 200-204 range", "[globalFx][parse]") {
    REQUIRE(isGlobalFxParamId(ParamId::Mix));
    REQUIRE(isGlobalFxParamId(ParamId::Intensity));
    REQUIRE_FALSE(isGlobalFxParamId(ParamId::Amplitude)); // 150
    REQUIRE_FALSE(isGlobalFxParamId(ParamId::None));
}
