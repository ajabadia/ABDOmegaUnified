/**
 * @file OmegaMath.h
 * OMEGA SDK — No-libm math helpers for WASM modules.
 *
 * Emscripten SIDE_MODULE builds must NOT import math symbols (env.sin / env.pow
 * / env.tan / env.exp / env.log). This header provides drop-in approximations
 * that compile to native wasm instructions (verified against the toolchain).
 *
 * Provided:
 *   omega_sin      — Bhaskara I rational approximation (error < 1e-3)
 *   omega_tan      — Taylor series, valid on the ZDF domain [0, 1.425]
 *   omega_exp2     — bit-exact exponent + degree-5 mantissa polynomial
 *   omega_exp      — exp(x) via omega_exp2 (log2(e) scaling)
 *   omega_log2     — bit-exact exponent + degree-5 mantissa polynomial
 *   omega_sqrt     — bit-hack seed + 2 Newton iterations
 *   omega_pow      — a^b via omega_exp(b * omega_log(a))
 *   omega_polyblep2 — 2nd-order PolyBLEP residual for anti-aliasing
 *   omega_saw_curvature — parabolic ramp bow (analog RC integration model)
 *   omega_softclip — Pade 3/3 tanh approximation (OTA saturation model)
 *   omega_floor    — manual floor for negative inputs
 *
 * All helpers are `static inline` (internal linkage): a SIDE_MODULE must never
 * export math symbols that Emscripten could promote to self-imports.
 */

#pragma once

#include <stdint.h>

namespace Omega::Math {

    // ── Floor (works for negatives; fastExp2 needs true floor) ──────────────
    static inline float omega_floor(float x) {
        float t = static_cast<float>(static_cast<int32_t>(x));
        if (t > x) t -= 1.0f;
        return t;
    }

    // ── Fractional part (wraps to [0, 1) — no fmodf import) ─────────────────
    static inline float omega_frac(float x) {
        float t = omega_floor(x);
        return x - t;
    }

    // ── IEEE-754 bit helpers (no libm) ──────────────────────────────────────
    static inline uint32_t omega_bits_ui(float f) {
        union { float f; uint32_t u; } c;
        c.f = f;
        return c.u;
    }
    static inline float omega_bits_f(uint32_t u) {
        union { float f; uint32_t u; } c;
        c.u = u;
        return c.f;
    }

    // ── sin(x) via Bhaskara I (error < 1e-3 over [-PI, PI]) ─────────────────
    static inline float omega_sin(float x) {
        while (x > 3.141592653589793f)  x -= 6.283185307179586f;
        while (x < -3.141592653589793f) x += 6.283185307179586f;
        if (x < 0.0f) return -omega_sin(-x);
        const float pimx = 3.141592653589793f - x;
        return (16.0f * x * pimx) /
               (5.0f * 3.141592653589793f * 3.141592653589793f - 4.0f * x * pimx);
    }

    // ── tan(x) on [0, 1.425] via Taylor (ZDF ladder domain) ─────────────────
    // Verified < 1e-6 relative vs std::tan on [0.0001, 1.425]. Must not be
    // called with |x| >= 1.425 (Taylor convergence knee).
    static inline float omega_tan(float x) {
        if (x < 0.0f) x = 0.0f;
        if (x > 1.425f) x = 1.425f;
        const float x2 = x * x;
        const float s = x * (1.0f + x2 * (-1.0f / 6.0f + x2 * (1.0f / 120.0f + x2 * (-1.0f / 5040.0f
                        + x2 * (1.0f / 362880.0f + x2 * (-1.0f / 39916800.0f))))));
        const float c = 1.0f + x2 * (-1.0f / 2.0f + x2 * (1.0f / 24.0f + x2 * (-1.0f / 720.0f
                        + x2 * (1.0f / 40320.0f + x2 * (-1.0f / 3628800.0f)))));
        return (c > 1.0e-7f) ? (s / c) : (s * 1.0e7f);
    }

    // ── 2^x on [-126, 126] (bit-exact exponent + degree-5 mantissa) ─────────
    // Pitch error < 0.001 cents over [-10, 10].
    static inline float omega_exp2(float x) {
        if (x <= -126.0f) return 0.0f;
        if (x >= 126.0f) return 8.50705917e+37f;

        const float n = omega_floor(x);
        const float f = x - n;
        float y = 0.99999976988588368f
                + f * (0.69315677328528258f
                + f * (0.24013170481445656f
                + f * (0.05587653949897675f
                + f * (0.00894058820920421f
                + f * 0.00189438161165486f))));

        const int32_t expVal = static_cast<int32_t>(n) + 127;
        if (expVal <= 0) return 0.0f;
        if (expVal >= 255) return y * 8.50705917e+37f; // clamp ~2^254

        const uint32_t e = static_cast<uint32_t>(expVal);
        return y * omega_bits_f(e << 23);
    }

    // ── log2(x) on [1, 2^24] via exponent + degree-5 mantissa ────────────────
    static inline float omega_log2(float x) {
        if (x <= 0.0f) return -126.0f;
        const uint32_t bits = omega_bits_ui(x);
        const int32_t exp = static_cast<int32_t>((bits >> 23) & 0xFF) - 127;
        float m = omega_bits_f((bits & 0x007FFFFF) | 0x3F800000u); // mantissa in [1, 2)
        float y = -1.7417939f
                + m * (2.8212026f
                + m * (-1.4699568f
                + m * (0.44717955f
                + m * -0.056570851f)));
        // The polynomial fits ln(m); scale by log2(e) to return log2(x).
        return static_cast<float>(exp) + y * 1.4426950408889634f;
    }

    // ── exp(x) = 2^(x * log2(e)) ─────────────────────────────────────────────
    static inline float omega_exp(float x) {
        return omega_exp2(x * 1.4426950408889634f);
    }

    // ── sqrt(x) via bit-hack seed + 2 Newton iterations ──────────────────────
    static inline float omega_sqrt(float x) {
        if (x <= 0.0f) return 0.0f;
        const uint32_t seed = 0x1FBD1DF5u + (omega_bits_ui(x) >> 1);
        float y = omega_bits_f(seed);
        y = 0.5f * (y + x / y);
        y = 0.5f * (y + x / y);
        return y;
    }

    // ── pow(a, b) = exp(b * log(a)) ──────────────────────────────────────────
    static inline float omega_pow(float a, float b) {
        if (a <= 0.0f) return 0.0f;
        return omega_exp(b * omega_log2(a) * 0.6931471805599453f);
    }

    // ── 2nd-order PolyBLEP residual ──────────────────────────────────────────
    // t in [0, 1), dt = phase increment. Zero except near the discontinuity.
    static inline float omega_polyblep2(float t, float dt) {
        if (t < dt) {
            const float n = t / dt;
            return n + n - n * n - 1.0f;
        }
        if (t > 1.0f - dt) {
            const float n = (t - 1.0f) / dt;
            return n + n + n * n + 1.0f;
        }
        return 0.0f;
    }

    // ── Sawtooth curvature (analog RC integration bulge) ─────────────────────
    // curvature 0 = linear ramp; 0.15 = Juno calibration.
    static inline float omega_saw_curvature(float phase, float curvature) {
        return phase * (1.0f + curvature * (1.0f - phase));
    }

    // ── Pade 3/3 tanh approximation (OTA saturation) ─────────────────────────
    static inline float omega_softclip(float x) {
        if (x > 3.0f)  return 1.0f;
        if (x < -3.0f) return -1.0f;
        const float x2 = x * x;
        return x * (27.0f + x2) / (27.0f + 9.0f * x2);
    }

    // ── Minimal LCG (deterministic, Numerical Recipes constants) ─────────────
    struct omega_lcg {
        uint32_t state;
        explicit omega_lcg(uint32_t seed) : state(seed) {}
        float next() {
            state = state * 1664525u + 1013904223u;
            return static_cast<float>(state & 0xFFFF) / 65535.0f;
        }
    };

} // namespace Omega::Math
