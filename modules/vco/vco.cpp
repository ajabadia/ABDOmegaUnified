/**
 * OMEGA WASM SDK - VCO (#vco)
 * Phase A — PolyBLEP multi-waveform analog-modeled oscillator.
 *
 * Fidelity notes (ported from ABDEep/ABDJUNiO601 DSP, re-derived no-libm):
 *   - Saw / square / pulse use 2nd-order PolyBLEP anti-aliasing
 *     (Omega::Math::omega_polyblep2).
 *   - Triangle = folded bandlimited square (blep at both fold points).
 *   - Sine via Bhaskara I (error < 1e-3).
 *   - Analog drift: slow LCG random walk applied as pitch offset (cents).
 *
 * Voice path (host): base pitch comes from omega_get_voice_frequency()
 * (set by midi_2_cv via omega_set_voice_freq). CV inputs (v_oct / fm / pwm /
 * sync) arrive on the shared 16-bus array and are added when patched.
 *
 * CONFIGURATION:
 *   waveform   (idx) 0..4 — sine/triangle/saw/square/pulse
 *   coarse     (st)  -12..12 — semitone detune
 *   fine       (ct)  -100..100 — cent detune
 *   pulse_width (pw) 0.05..0.95 — pulse duty (square = 0.5)
 *   fm_amount  (0..1) — FM index from fm input
 *   pwm_amount (0..1) — PWM depth from pwm input
 *   sub_on     (bin) — sub oscillator (one octave down square) enable
 *   drift      (0..1) — analog drift depth
 *
 * All DSP lives in an anonymous namespace (internal linkage) so the wasm
 * only imports host services (omega_*_voice_*) — never its own symbols
 * (SIDE_MODULE self-import pattern documented in modules/440demo).
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>
#include <Core/Ace/OmegaMath.h>

using namespace Omega::Constants;
using namespace Omega::Math;

// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

extern "C" {
    WASM_IMPORT(omega_get_voice_frequency) float omega_get_voice_frequency(void);
    WASM_IMPORT(omega_publish_telemetry)   void   omega_publish_telemetry(float value);
}

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("vco", "Omega VCO (PolyBLEP)")
    OMEGA_FAMILY("oscillator")
    OMEGA_PARAM(waveform,     "Waveform", 0, 4, 0,                 "idx")
    OMEGA_PARAM(coarse,       "Coarse",   -12, 12, 0,              "st")
    OMEGA_PARAM(fine,         "Fine",     -100, 100, 0,            "ct")
    OMEGA_PARAM(pulse_width,  "Pulse W",  0.05, 0.95, 0.5,         "pw")
    OMEGA_PARAM(fm_amount,    "FM Amount", 0.0, 1.0, 0.0,          "amp")
    OMEGA_PARAM(pwm_amount,   "PWM Amount", 0.0, 1.0, 0.0,         "amp")
    OMEGA_PARAM(sub_on,       "Sub Osc",  0, 1, 1,                 "bin")
    OMEGA_PARAM(drift,        "Drift",    0.0, 1.0, 0.15,          "amp")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(v_oct,   "V/Oct",      input,  cv)
        OMEGA_PORT(fm,      "FM",         input,  cv)
        OMEGA_PORT(pwm,     "PWM",        input,  cv)
        OMEGA_PORT(sync,    "Sync",       input,  gate)
        OMEGA_PORT(out,     "Out",        output, audio)
        OMEGA_PORT(sub_out, "Sub Out",    output, audio)
END_OMEGA_PARAMETERS

namespace {

    // Índices de parámetro del contrato (mismo orden que los OMEGA_PARAM).
    enum ParamId : int {
        kParamWaveform   = 0,
        kParamCoarse     = 1,
        kParamFine       = 2,
        kParamPulseWidth = 3,
        kParamFmAmount   = 4,
        kParamPwmAmount  = 5,
        kParamSubOn      = 6,
        kParamDrift      = 7,
    };

    // Bus slots for patched CV inputs (shared 16-bus voice array).
    // Convention (Phase A voice chain): bus 0/1 = audio L/R, 2 = sub/aux L,
    // 3 = aux R, 4 = ENV (ADSR out → VCA in), 5 = LFO out, 6+ = free CV ports.
    // Base pitch arrives via omega_get_voice_frequency(); these CV buses are
    // written by other modules when the patch routes cables into the VCO.
    constexpr int kBusVOct = 6;
    constexpr int kBusFm   = 7;
    constexpr int kBusPwm  = 8;
    constexpr int kBusSync = 9;

    constexpr float kDriftTauCoeff = 0.9995f; // 1-pole smoothing for drift walk
    constexpr float kDriftMaxCents = 6.0f;    // full-drift peak wander

    // --- DSP state (internal linkage) ---
    float g_sampleRate = DEFAULT_SAMPLE_RATE;

    int   g_waveform    = 0;
    float g_coarseSt    = 0.0f;
    float g_fineCt      = 0.0f;
    float g_pulseWidth  = 0.5f;
    float g_fmAmount    = 0.0f;
    float g_pwmAmount   = 0.0f;
    bool  g_subOn       = true;
    float g_driftAmount = 0.15f;

    float g_phase = 0.0f;      // main oscillator phase [0,1)
    float g_subPhase = 0.0f;   // sub oscillator phase (octave down)
    bool  g_syncPrev = false;  // previous sync gate state (edge detect)
    float g_driftCents = 0.0f;
    omega_lcg g_driftLcg(0xA5A5A5A5u);

    // --- helpers ---
    float clampf(float v, float lo, float hi) {
        if (v < lo) return lo;
        if (v > hi) return hi;
        return v;
    }

    float bandlimitedSquare(float ph, float pw, float dt) {
        float out = (ph < pw) ? 1.0f : -1.0f;
        out += omega_polyblep2(ph, dt);                    // rising edge at 0
        out -= omega_polyblep2(omega_frac(ph + 1.0f - pw), dt); // falling edge at pw
        return out;
    }

    float bandlimitedSaw(float ph, float dt) {
        float out = 2.0f * ph - 1.0f;
        out -= omega_polyblep2(ph, dt);
        return out;
    }

    float bandlimitedTriangle(float ph, float dt) {
        // Fold a bandlimited saw: tri = 2*|saw| - 1 with blep at fold points.
        float tri = 4.0f * (ph < 0.5f ? ph : 1.0f - ph) - 1.0f;
        tri += omega_polyblep2(ph, dt);                          // fold at 0 / 1
        tri -= omega_polyblep2(omega_frac(ph + 0.5f), dt);       // fold at 0.5
        return tri;
    }

    float renderWave(float ph, float pw, float dt, int wave) {
        switch (wave) {
            case 0: return omega_sin(ph * TAU);                  // sine
            case 1: return bandlimitedTriangle(ph, dt);          // triangle
            case 2: return bandlimitedSaw(ph, dt);               // saw
            case 3: return bandlimitedSquare(ph, 0.5f, dt);      // square
            default: return bandlimitedSquare(ph, pw, dt);       // pulse
        }
    }

    void vcoInit(float sampleRate) {
        g_sampleRate = sampleRate > 0.0f ? sampleRate : DEFAULT_SAMPLE_RATE;
        g_waveform = 0;
        g_coarseSt = 0.0f;
        g_fineCt = 0.0f;
        g_pulseWidth = 0.5f;
        g_fmAmount = 0.0f;
        g_pwmAmount = 0.0f;
        g_subOn = true;
        g_driftAmount = 0.15f;
        g_phase = 0.0f;
        g_subPhase = 0.0f;
        g_syncPrev = false;
        g_driftCents = 0.0f;
    }

    void vcoOnParam(int paramId, float value) {
        switch (paramId) {
            case kParamWaveform:   g_waveform = (int)value; break;
            case kParamCoarse:     g_coarseSt = value; break;
            case kParamFine:       g_fineCt = value; break;
            case kParamPulseWidth: g_pulseWidth = clampf(value, 0.05f, 0.95f); break;
            case kParamFmAmount:   g_fmAmount = clampf(value, 0.0f, 1.0f); break;
            case kParamPwmAmount:  g_pwmAmount = clampf(value, 0.0f, 1.0f); break;
            case kParamSubOn:      g_subOn = (value > BIN_ON_THRESHOLD); break;
            case kParamDrift:      g_driftAmount = clampf(value, 0.0f, 1.0f); break;
            default: break;
        }
    }

    void vcoProcess(float* buffer, int length) {
        const int wave = (g_waveform < 0) ? 0 : (g_waveform > 4 ? 4 : g_waveform);

        for (int i = 0; i < length; ++i) {
            // CV inputs from the shared bus array (patched by other modules).
            const float cvVoct = (length == 1) ? buffer[kBusVOct] : 0.0f;
            const float cvFm   = (length == 1) ? buffer[kBusFm]   : 0.0f;
            const float cvPwm  = (length == 1) ? buffer[kBusPwm]  : 0.0f;
            const float sync   = (length == 1) ? buffer[kBusSync] : 0.0f;

            // Drift: slow 1-pole random walk in cents (analog instability).
            const float rnd = (g_driftLcg.next() * 2.0f - 1.0f);
            g_driftCents = g_driftCents * kDriftTauCoeff + rnd * 0.05f;

            // Base pitch (Hz) from the owning voice + detune + CV.
            float baseHz = omega_get_voice_frequency();
            if (baseHz <= 0.0f) baseHz = CONCERT_A_FREQ;

            // Semitone/cent detune: freq * 2^(st/12 + ct/1200).
            const float detuneSemis = g_coarseSt + g_fineCt / 100.0f;
            float hz = baseHz * omega_exp2(detuneSemis / 12.0f);

            // V/Oct CV (1 V = 1 octave).
            hz *= omega_exp2(cvVoct);

            // FM: exponential index scaled by fm_amount (bounded to ±4 oct).
            const float fmSemis = clampf(cvFm * 48.0f * g_fmAmount, -48.0f, 48.0f);
            hz *= omega_exp2(fmSemis / 12.0f);

            // Drift (cents).
            hz *= omega_exp2(g_driftCents * kDriftMaxCents * g_driftAmount / 1200.0f);

            const float dt = hz / g_sampleRate;

            // Hard sync: rising edge of sync CV resets phase.
            const bool syncOn = sync > BIN_ON_THRESHOLD;
            if (syncOn && !g_syncPrev) g_phase = 0.0f;
            g_syncPrev = syncOn;

            // PWM: width modulated by pwm CV (bounded [0.05, 0.95]).
            float pw = g_pulseWidth;
            if (g_pwmAmount > 0.0f) {
                pw = g_pulseWidth + cvPwm * 0.45f * g_pwmAmount;
                pw = clampf(pw, 0.05f, 0.95f);
            }

            const float sample = renderWave(g_phase, pw, dt, wave);

            // Sub oscillator: one octave down square (PolyBLEP).
            float sub = 0.0f;
            if (g_subOn) {
                g_subPhase += dt * 0.5f;
                if (g_subPhase >= 1.0f) g_subPhase -= 1.0f;
                sub = bandlimitedSquare(g_subPhase, 0.5f, dt * 0.5f);
            }

            // Phase advance + wrap.
            g_phase += dt;
            if (g_phase >= 1.0f) g_phase -= 1.0f;

            // Voice path: write L (bus 0) and R (bus 1). Sub on bus 2 (aux L).
            buffer[i] = sample;
            if (length == 1) {
                buffer[VOICE_BUS_RIGHT] = sample;
                buffer[2] = sub;
            }
        }

        omega_publish_telemetry(0.0f);
    }

} // namespace

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { vcoInit(sampleRate); }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { vcoOnParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) { (void)status; (void)d1; (void)d2; }
    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) { vcoProcess(buffer, length); }
}
