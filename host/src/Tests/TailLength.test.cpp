/**
 * [P1-4] Cola de release declarada al host (getTailLengthSeconds).
 *
 * Diagnóstico original: el plugin declaraba 0.1 s de cola mientras el registro
 * permite un release de hasta 10 s (layer.a.env.release: 1..10000 ms, default
 * 500). Al parar el transporte, el host corta el offlining a los 0.1 s → clics
 * cuando el sonido aún tiene cola de release.
 *
 * Este test fija la invariante de la FUENTE DE VERDAD (el registro) y del
 * helper puro que la convierte en segundos: la cola declarada es siempre
 * releaseMs/1000 + margen (nunca menor que el release real).
 */
#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>

#include "ParameterMetadataRegistry.h"
#include "TailLength.h"

using namespace Omega::Plugin;

TEST_CASE("la cola cubre el release + margen (helper puro)", "[tail][p1-4]") {
    // release máximo del registro (10 s) → cola 10.5 s
    REQUIRE(computeTailLengthSeconds(10000.0f) == Catch::Approx(10.5));
    // release default (500 ms) → cola 1.0 s
    REQUIRE(computeTailLengthSeconds(500.0f) == Catch::Approx(1.0));
    // release mínimo (1 ms) → cola 0.501 s
    REQUIRE(computeTailLengthSeconds(1.0f) == Catch::Approx(0.501));
    // release 0 (edge) → solo el margen
    REQUIRE(computeTailLengthSeconds(0.0f) == Catch::Approx(0.5));
    // La cola NUNCA es menor que el release en segundos (invariante anti-clic).
    REQUIRE(computeTailLengthSeconds(10000.0f) >= 10.0);
    REQUIRE(computeTailLengthSeconds(7500.0f) >= 7.5);
}

TEST_CASE("denormalizeParam convierte 0-1 al rango físico del registro", "[tail][p1-4]") {
    // layer.a.env.release: 1..10000 ms
    REQUIRE(denormalizeParam(0.0f, 1.0f, 10000.0f) == Catch::Approx(1.0f));
    REQUIRE(denormalizeParam(0.5f, 1.0f, 10000.0f) == Catch::Approx(5000.5f));
    REQUIRE(denormalizeParam(1.0f, 1.0f, 10000.0f) == Catch::Approx(10000.0f));
}

TEST_CASE("el registro es la fuente de verdad del rango de release", "[tail][p1-4][registry]") {
    const auto* desc = Omega::Core::ParameterMetadataRegistry::getInstance().getParameter("layer.a.env.release");
    REQUIRE(desc != nullptr);

    // Rango físico: 1..10000 ms (10 s) — el techo que la cola debe cubrir.
    REQUIRE(desc->unit == "ms");
    REQUIRE(desc->minValue == Catch::Approx(1.0f));
    REQUIRE(desc->maxValue == Catch::Approx(10000.0f));
    REQUIRE(desc->defaultValue == Catch::Approx(500.0f));

    // Cola calculada con el máximo del registro: nunca por debajo de 10 s.
    REQUIRE(computeTailLengthSeconds(desc->maxValue) >= 10.0);
}
