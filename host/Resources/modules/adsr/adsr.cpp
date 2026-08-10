/**
 * OMEGA WASM SDK - ADSR (#adsr)
 * Phase A — Exponential attack/decay/sustain/release envelope generator.
 *
 * Analog-modeled: each segment is an exponential approach to its target with
 * a time constant derived from the segment time (1 - exp(-1/(tau*sr)), computed
 * with Omega::Math::omega_exp — no libm). This matches the classic RC
 * envelope of the JUNO-106 (the same recurrence the ABDEep ADSR uses).
 *
 * Triggering: the voice gate is read from the host (omega_get_voice_gate),
 * so the ADSR tracks the per-voice gate/release driven by OmegaAsepticVoice.
 * A gate CV can also be patched into the gate_in port (bus 4): whichever is
 * non-zero opens the envelope (host gate takes precedence).
 *
 * Output convention (voice path):
 *   bus 4 — envelope CV (the amplitude envelope bus; the VCA module reads it)
 *   bus 3 — aux R copy (observable without touching the audio chain on bus 0/1)
 *
 * CONFIGURATION:
 *   attack  (ms) 0.5..10000 — attack time
 *   decay   (ms) 1..10000   — decay time (1 -> sustain)
 *   sustain (0..1) — sustain level
 *   release (ms) 1..10000   — release time
 *   depth   (0..1) — output depth (scales the whole envelope, default 1)
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>
#include <Core/Ace/OmegaMath.h>

using namespace Omega::Constants;
using namespace Omega::Math;

// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

extern "C" {
    WASM_IMPORT(omega_get_voice_gate) float omega_get_voice_gate(void);
    WASM_IMPORT(omega_publish_telemetry) void omega_publish_telemetry(float value);
}

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("adsr", "Omega ADSR Envelope")
    OMEGA_FAMILY("control")
    OMEGA_PARAM(attack,  "Attack",  0.5, 10000.0, 5.0,   "ms")
    OMEGA_PARAM(decay,   "Decay",   1.0, 10000.0, 200.0, "ms")
    OMEGA_PARAM(sustain, "Sustain", 0.0, 1.0, 0.6,        "amp")
    OMEGA_PARAM(release, "Release", 1.0, 10000.0, 400.0,  "ms")
    OMEGA_PARAM(depth,   "Depth",   0.0, 1.0, 1.0,        "amp")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(gate_in, "Gate In", input, gate)
        OMEGA_PORT(out,     "Out",     output, cv)
END_OMEGA_PARAMETERS

namespace {

    enum ParamId : int {
        kParamAttack  = 0,
        kParamDecay   = 1,
        kParamSustain = 2,
        kParamRelease = 3,
        kParamDepth   = 4,
    };

    // Envelope CV bus the VCA module reads (shared 16-bus voice array).
    // Phase A convention: bus 0/1 = audio L/R, 2 = sub/aux L, 3 = aux R,
    // 4 = ENV (ADSR → VCA), 5 = LFO out, 6..15 = free patch CV slots.
    constexpr int kBusEnvOut = 4;
    constexpr int kBusGateIn = 12;

    enum Segment : int {
        kSegIdle    = 0,
        kSegAttack  = 1,
        kSegDecay   = 2,
        kSegSustain = 3,
        kSegRelease = 4,
    };

    // --- DSP state (internal linkage) ---
    float g_sampleRate = DEFAULT_SAMPLE_RATE;
    float g_attackMs   = 5.0f;
    float g_decayMs    = 200.0f;
    float g_sustain    = 0.6f;
    float g_releaseMs  = 400.0f;
    float g_depth      = 1.0f;

    float g_env = 0.0f;
    int   g_segment = kSegIdle;
    bool  g_gatePrev = false;

    float msToCoef(float ms) {
        const float sec = (ms > 0.1f ? ms : 0.1f) / MS_TO_S_FACTOR;
        // Envelope time constant: ~tau = time/4 (analog RC settle to 98%).
        return 1.0f - omega_exp(-1.0f / (sec * 0.25f * g_sampleRate));
    }

    void adsrInit(float sampleRate) {
        g_sampleRate = sampleRate > 0.0f ? sampleRate : DEFAULT_SAMPLE_RATE;
        g_attackMs = 5.0f;
        g_decayMs = 200.0f;
        g_sustain = 0.6f;
        g_releaseMs = 400.0f;
        g_depth = 1.0f;
        g_env = 0.0f;
        g_segment = kSegIdle;
        g_gatePrev = false;
    }

    void adsrOnParam(int paramId, float value) {
        switch (paramId) {
            case kParamAttack:  g_attackMs = value > 0.0f ? value : 0.1f; break;
            case kParamDecay:   g_decayMs  = value > 0.0f ? value : 0.1f; break;
            case kParamSustain: g_sustain = value < 0.0f ? 0.0f : (value > 1.0f ? 1.0f : value); break;
            case kParamRelease: g_releaseMs = value > 0.0f ? value : 0.1f; break;
            case kParamDepth:   g_depth = value < 0.0f ? 0.0f : (value > 1.0f ? 1.0f : value); break;
            default: break;
        }
    }

    void adsrProcess(float* buffer, int length) {
        for (int i = 0; i < length; ++i) {
            const bool gateHost = omega_get_voice_gate() > BIN_ON_THRESHOLD;
            const bool gateCv   = (length == 1) ? (buffer[kBusGateIn] > BIN_ON_THRESHOLD) : false;
            const bool gate = gateHost || gateCv;

            // Gate edge handling: rising starts attack, falling starts release.
            if (gate && !g_gatePrev) g_segment = kSegAttack;
            if (!gate && g_gatePrev) g_segment = kSegRelease;
            g_gatePrev = gate;

            float target;
            float coef;

            switch (g_segment) {
                case kSegAttack:
                    target = 1.0f;
                    coef = msToCoef(g_attackMs);
                    if (g_env >= 0.999f) { g_env = 1.0f; g_segment = kSegDecay; coef = 0.0f; target = g_sustain; }
                    break;
                case kSegDecay:
                    target = g_sustain;
                    coef = msToCoef(g_decayMs);
                    if (g_env <= g_sustain + 1.0e-4f) { g_env = g_sustain; g_segment = kSegSustain; coef = 0.0f; target = g_sustain; }
                    break;
                case kSegSustain:
                    target = g_sustain;
                    coef = 0.0f;
                    g_env = g_sustain;
                    break;
                case kSegRelease:
                    target = 0.0f;
                    coef = msToCoef(g_releaseMs);
                    if (g_env <= 1.0e-4f) { g_env = 0.0f; g_segment = kSegIdle; coef = 0.0f; target = 0.0f; }
                    break;
                default: // kSegIdle
                    target = 0.0f;
                    coef = 0.0f;
                    g_env = 0.0f;
                    break;
            }

            // Exponential approach.
            g_env += coef * (target - g_env);

            const float out = g_env * g_depth;
            if (length == 1) {
                buffer[kBusEnvOut] = out; // envelope CV bus (VCA reads this)
                buffer[3] = out;          // aux R copy (observable)
            } else {
                buffer[i] = out;
            }
        }

        omega_publish_telemetry(g_env);
    }

} // namespace

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { adsrInit(sampleRate); }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { adsrOnParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) { (void)status; (void)d1; (void)d2; }
    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) { adsrProcess(buffer, length); }
}
