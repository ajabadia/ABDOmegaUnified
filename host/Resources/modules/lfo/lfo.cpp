/**
 * OMEGA WASM SDK - LFO (#lfo)
 * Phase A — Multi-waveform low-frequency oscillator (JUNO-106 model).
 *
 * Five analog-style shapes, all no-libm:
 *   sine    — Bhaskara I
 *   triangle — folded bandlimited square (blep at fold points)
 *   saw     — bandlimited saw (PolyBLEP)
 *   square  — bandlimited square
 *   s&h     — random staircase sampled at the LFO rate (deterministic LCG)
 *
 * Aseptic voice convention: the LFO writes its output to the LFO bus (5)
 * which other modules (VCF cutoff CV, VCO FM) read for modulation.
 *
 * CONFIGURATION:
 *   rate    (hz) 0.01..30.0 — LFO frequency
 *   shape   (idx) 0..4 — sine/tri/saw/square/s&h
 *   amount  (0..1) — output depth
 *   sync_to_gate (bin) — reset phase on voice gate rising edge
 *
 * Output convention:
 *   bus 5 — LFO CV (modulation)
 *   bus 3 — aux R copy (observable)
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>
#include <Core/Ace/OmegaMath.h>

using namespace Omega::Constants;
using namespace Omega::Math;

// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

extern "C" {
    WASM_IMPORT(omega_get_voice_gate)     float omega_get_voice_gate(void);
    WASM_IMPORT(omega_publish_telemetry)  void   omega_publish_telemetry(float value);
}

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("lfo", "Omega LFO")
    OMEGA_FAMILY("control")
    OMEGA_PARAM(rate,        "Rate",     0.01, 30.0, 2.0, "hz")
    OMEGA_PARAM(shape,       "Shape",    0, 4, 0,          "idx")
    OMEGA_PARAM(amount,      "Amount",   0.0, 1.0, 0.5,    "amp")
    OMEGA_PARAM(sync_to_gate, "Sync to Gate", 0, 1, 0,     "bin")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(out, "Out", output, cv)
END_OMEGA_PARAMETERS

namespace {

    enum ParamId : int {
        kParamRate       = 0,
        kParamShape      = 1,
        kParamAmount     = 2,
        kParamSyncToGate = 3,
    };

    // Phase A voice convention (see ADSR): LFO CV bus for modulation.
    constexpr int kBusLfoOut = 5;

    enum Shape : int {
        kShapeSine     = 0,
        kShapeTriangle = 1,
        kShapeSaw      = 2,
        kShapeSquare   = 3,
        kShapeSAndH    = 4,
    };

    // --- DSP state (internal linkage) ---
    float g_sampleRate = DEFAULT_SAMPLE_RATE;
    float g_rateHz     = 2.0f;
    int   g_shape      = 0;
    float g_amount     = 0.5f;
    bool  g_syncToGate = false;

    float g_phase = 0.0f;
    bool  g_gatePrev = false;
    float g_shValue = 0.0f;
    omega_lcg g_shLcg(0x7F4A7C15u);

    float renderShape(float ph, float dt, int shape) {
        switch (shape) {
            case kShapeTriangle:
                return 4.0f * (ph < 0.5f ? ph : 1.0f - ph) - 1.0f
                     + omega_polyblep2(ph, dt)
                     - omega_polyblep2(omega_frac(ph + 0.5f), dt);
            case kShapeSaw: {
                float out = 2.0f * ph - 1.0f;
                out -= omega_polyblep2(ph, dt);
                return out;
            }
            case kShapeSquare: {
                float out = (ph < 0.5f) ? 1.0f : -1.0f;
                out += omega_polyblep2(ph, dt);
                out -= omega_polyblep2(omega_frac(ph + 0.5f), dt);
                return out;
            }
            case kShapeSAndH:
                return g_shValue;
            default: // sine
                return omega_sin(ph * TAU);
        }
    }

    void lfoInit(float sampleRate) {
        g_sampleRate = sampleRate > 0.0f ? sampleRate : DEFAULT_SAMPLE_RATE;
        g_rateHz = 2.0f;
        g_shape = 0;
        g_amount = 0.5f;
        g_syncToGate = false;
        g_phase = 0.0f;
        g_gatePrev = false;
        g_shValue = 0.0f;
    }

    void lfoOnParam(int paramId, float value) {
        switch (paramId) {
            case kParamRate:    g_rateHz = value > 0.0f ? value : 0.01f; break;
            case kParamShape:   g_shape = (int)value; break;
            case kParamAmount:  g_amount = value < 0.0f ? 0.0f : (value > 1.0f ? 1.0f : value); break;
            case kParamSyncToGate: g_syncToGate = (value > BIN_ON_THRESHOLD); break;
            default: break;
        }
    }

    void lfoProcess(float* buffer, int length) {
        const float step = g_rateHz / g_sampleRate;

        for (int i = 0; i < length; ++i) {
            const bool gate = omega_get_voice_gate() > BIN_ON_THRESHOLD;

            // Phase reset on gate rising edge.
            if (g_syncToGate && gate && !g_gatePrev) g_phase = 0.0f;
            g_gatePrev = gate;

            // S&H: sample a fresh random value once per LFO cycle.
            if (g_shape == kShapeSAndH && g_phase < step) {
                g_shValue = g_shLcg.next() * 2.0f - 1.0f;
            }

            const float out = renderShape(g_phase, step, g_shape) * g_amount;

            g_phase += step;
            if (g_phase >= 1.0f) g_phase -= 1.0f;

            if (length == 1) {
                buffer[kBusLfoOut] = out; // LFO CV bus (modulation)
                buffer[3] = out;          // aux R copy (observable)
            } else {
                buffer[i] = out;
            }
        }

        omega_publish_telemetry(0.0f);
    }

} // namespace

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { lfoInit(sampleRate); }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { lfoOnParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) { (void)status; (void)d1; (void)d2; }
    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) { lfoProcess(buffer, length); }
}
