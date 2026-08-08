#pragma once

namespace Omega::Plugin {

    /**
     * [P1-4] Cálculo de la cola de release declarada al host.
     *
     * getTailLengthSeconds() le dice al host cuánto tiempo debe seguir llamando
     * a processBlock tras parar el transporte (offlining). Antes el plugin
     * declaraba 0.1 s con un release máximo de 10 s → clics al parar el
     * transporte cuando el sonido aún tenía cola de release.
     *
     * La cola se deriva del parámetro `layer.a.env.release` (registro:
     * 1..10000 ms, default 500 ms) + un margen fijo de seguridad. Declarar
     * MENOS de lo que necesita el patch produce clics; declarar más solo hace
     * que el host pida audio unos cientos de ms extra (inofensivo).
     *
     * Todas las funciones son puras (sin E/S ni estado) → testeables sin
     * instanciar el processor (TailLength.test.cpp).
     */
    inline constexpr double kTailMarginSeconds = 0.5;

    /** Desnormaliza un valor APVTS (0-1) al rango físico [minValue, maxValue]
     *  del registro (p. ej. release en ms). */
    inline float denormalizeParam(float normalized, float minValue, float maxValue) noexcept {
        return minValue + normalized * (maxValue - minValue);
    }

    /** Cola de release en segundos a partir del release físico en ms + margen. */
    inline double computeTailLengthSeconds(float releaseMs, double marginSeconds = kTailMarginSeconds) noexcept {
        return static_cast<double>(releaseMs) / 1000.0 + marginSeconds;
    }

} // namespace Omega::Plugin
