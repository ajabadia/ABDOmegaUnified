/**
 * OMEGA WASM SDK - VCF (#vcf)
 * Phase A — TPT ZDF OTA ladder filter (IR3109 / 80017A model), no-libm.
 *
 * Ported from ABDEep JunoVCF_ZDF (Source/DSP/JunoVCF_ZDF_Process.cpp) with
 * every transcendental replaced by Omega::Math approximations:
 *   - fastTan (Taylor) for the g coefficient (valid on the ZDF domain).
 *   - Pade 3/3 tanh (omega_softclip) for OTA saturation + Newton stage solver.
 *   - omega_pow / omega_log2 / omega_exp for resonance compensation.
 *
 * Output modes (taps):
 *   lp    — 4-pole lowpass (-24 dB/oct)
 *   hp    — 4th-order highpass comb
 *   bp    — bandpass (s2 - s4)
 *   notch — lp + hp
 *
 * CONFIGURATION:
 *   cutoff      (hz)   20..20000 — corner frequency
 *   resonance   (0..1) — J106 resonance polynomial (self-osc at ~0.86)
 *   mode        (idx)  0..3 — lp/hp/bp/notch
 *   keytrack    (0..1) — 1:1 per-octave cutoff tracking (pivot middle C)
 *   cutoff_cv   (0..1) — depth of the cutoff CV input (bus 4)
 *   res_cv      (0..1) — depth of the resonance CV input (bus 5)
 *
 * Voice path: audio in/out on bus 0 (L) / bus 1 (R). Cutoff and resonance CV
 * arrive on shared buses (4/5) when patched.
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
BEGIN_OMEGA_PARAMETERS("vcf", "Omega VCF (ZDF Ladder)")
    OMEGA_FAMILY("filter")
    OMEGA_PARAM(cutoff,     "Cutoff",   20.0, 20000.0, 1000.0, "hz")
    OMEGA_PARAM(resonance,  "Resonance", 0.0, 1.0, 0.25,        "amp")
    OMEGA_PARAM(mode,       "Mode",      0, 3, 0,               "idx")
    OMEGA_PARAM(keytrack,   "Key Track", 0.0, 1.0, 0.5,         "amp")
    OMEGA_PARAM(cutoff_cv,  "Cutoff CV", 0.0, 1.0, 0.5,         "amp")
    OMEGA_PARAM(res_cv,     "Res CV",    0.0, 1.0, 0.0,         "amp")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(in,         "In",      input,  audio)
        OMEGA_PORT(cutoff_cv,  "Cutoff",  input,  cv)
        OMEGA_PORT(res_cv,     "Res",     input,  cv)
        OMEGA_PORT(out,        "Out",     output, audio)
END_OMEGA_PARAMETERS

namespace {

    enum ParamId : int {
        kParamCutoff    = 0,
        kParamResonance = 1,
        kParamMode      = 2,
        kParamKeytrack  = 3,
        kParamCutoffCv  = 4,
        kParamResCv     = 5,
    };

    constexpr int kBusCutoffCv = 10;
    constexpr int kBusResCv    = 11;

    // Reference for 1:1 key tracking (middle C).
    constexpr float kMiddleCHz = 261.6255653005986f;

    // --- DSP state (internal linkage) ---
    float g_sampleRate = DEFAULT_SAMPLE_RATE;

    float g_cutoff     = 1000.0f;
    float g_resonance  = 0.25f;
    int   g_mode       = 0;
    float g_keytrack   = 0.5f;
    float g_cutoffCv   = 0.5f;
    float g_resCv      = 0.0f;

    // ZDF ladder state (4 integrators).
    float g_s[4] = { 0.0f, 0.0f, 0.0f, 0.0f };

    // --- Resonance curve: J106 polynomial fit (k reaches ~4 at res≈0.855) ---
    float resK(float res) {
        const float r2 = res * res;
        const float r3 = r2 * res;
        const float r4 = r2 * r2;
        float k = 1.24f * (4.7116f * res - 6.5743f * r2 + 13.4633f * r3 - 8.2197f * r4);
        // Soft clip above k = 4 (OTA gain compression), clamp to 6.6.
        if (k > 4.0f) {
            const float excess = k - 4.0f;
            k = 4.0f + excess / (1.0f + excess * 0.2f);
        }
        if (k > 6.6f) k = 6.6f;
        if (k < 0.0f) k = 0.0f;
        return k;
    }

    // --- Frequency compensation (no-libm pow/log/exp equivalents) ---
    float freqCompensation(float k, float frq) {
        const float f = (frq < 1.0e-6f) ? 1.0e-6f : frq;
        float lowQ = 1.0f;
        float c = 0.42f * omega_pow(f, -0.12f);
        if (c > 1.0f) lowQ = c;
        const float logDist = omega_log2(f / 0.012f) * 0.6931471805599453f;
        lowQ += 0.20f * omega_exp(-logDist * logDist);
        const float blend = (k * k * 0.0625f < 1.0f) ? (k * k * 0.0625f) : 1.0f;
        return lowQ + blend * (1.0f - lowQ);
    }

    float inputComp(float k, float frq) {
        const float qComp = 0.379f + 0.087f * k;
        const float f = (frq < 1.0e-6f) ? 1.0e-6f : frq;
        float freqGain = omega_pow(f * (1.0f / 0.00445f), -0.10f);
        if (freqGain < 0.65f) freqGain = 0.65f;
        if (freqGain > 1.2f) freqGain = 1.2f;
        return qComp * freqGain;
    }

    // --- OTA saturation scaling (frequency/resonance dependent) ---
    float otaScaleForFreq(float frq, float res) {
        constexpr float kBase = 0.35f;
        float scale = kBase;
        if (frq < 0.005f) {
            float blend = frq / 0.005f;
            if (blend < 0.15f) blend = 0.15f;
            scale *= blend;
        }
        if (res > 0.0f) {
            const float rk = resK(res);
            float resBlend = rk * rk * 0.0625f;
            if (resBlend > 1.0f) resBlend = 1.0f;
            scale = scale + resBlend * (kBase - scale);
        }
        return scale;
    }

    // --- OTA saturation derivative (Pade 3/3 tanh) ---
    float otaDeriv(float x) {
        if (x > 3.0f || x < -3.0f) return 0.0f;
        const float x2 = x * x;
        const float d = 27.0f + 9.0f * x2;
        return 27.0f * (27.0f - 3.0f * x2) / (d * d);
    }

    // --- Non-linear stage solver via Newton-Raphson (Pade OTA) ---
    float nlStage(float& s, float x, float g, float g1, float otaScale) {
        float y = s + g1 * (x - s);
        float diff = x - y;
        float sd = diff * otaScale;
        float t = omega_softclip(sd) / otaScale;
        float f = y - s - g * t;
        float df = 1.0f + g * otaDeriv(sd);
        y -= f / df;
        s = 2.0f * y - s;
        return y;
    }

    float clampf(float v, float lo, float hi) {
        if (v < lo) return lo;
        if (v > hi) return hi;
        return v;
    }

    void vcfInit(float sampleRate) {
        g_sampleRate = sampleRate > 0.0f ? sampleRate : DEFAULT_SAMPLE_RATE;
        g_cutoff = 1000.0f;
        g_resonance = 0.25f;
        g_mode = 0;
        g_keytrack = 0.5f;
        g_cutoffCv = 0.5f;
        g_resCv = 0.0f;
        g_s[0] = g_s[1] = g_s[2] = g_s[3] = 0.0f;
    }

    void vcfOnParam(int paramId, float value) {
        switch (paramId) {
            case kParamCutoff:    g_cutoff = value; break;
            case kParamResonance: g_resonance = clampf(value, 0.0f, 1.0f); break;
            case kParamMode:      g_mode = (int)value; break;
            case kParamKeytrack:  g_keytrack = clampf(value, 0.0f, 1.0f); break;
            case kParamCutoffCv:  g_cutoffCv = clampf(value, 0.0f, 1.0f); break;
            case kParamResCv:     g_resCv = clampf(value, 0.0f, 1.0f); break;
            default: break;
        }
    }

    void vcfProcess(float* buffer, int length) {
        for (int i = 0; i < length; ++i) {
            const float input = buffer[i];
            const float cvCut = (length == 1) ? buffer[kBusCutoffCv] : 0.0f;
            const float cvRes = (length == 1) ? buffer[kBusResCv]    : 0.0f;

            // Key tracking: cutoff * 2^(semitones_from_middleC/12 * keytrack).
            const float noteHz = omega_get_voice_frequency();
            float hz = g_cutoff;
            if (g_keytrack > 0.0f && noteHz > 0.0f) {
                hz *= omega_exp2((omega_log2(noteHz / kMiddleCHz) / omega_log2(2.0f))
                                 * g_keytrack);
            }

            // Cutoff CV: ±1 octave around the base per unit CV depth.
            hz *= omega_exp2(cvCut * 12.0f * g_cutoffCv / 12.0f);
            if (hz < 20.0f) hz = 20.0f;
            if (hz > 20000.0f) hz = 20000.0f;

            // Resonance CV adds to the base resonance (bounded to 1.0).
            float res = g_resonance + cvRes * g_resCv;
            if (res > 1.0f) res = 1.0f;

            // Normalized frequency (0..~0.45 → keeps fastTan on its valid domain).
            float frq = hz / (g_sampleRate * 0.5f);
            if (frq > 0.45f) frq = 0.45f;
            if (frq < 0.00001f) frq = 0.00001f;

            const float k = resK(res);

            // --- ZDF coefficient ---
            float gcoef = omega_tan(frq * 3.141592653589793f * 0.5f);
            gcoef *= freqCompensation(k, frq * 0.25f);
            const float g1 = gcoef / (1.0f + gcoef);
            const float comp = inputComp(k, frq);

            // Input equation with resonance feedback (OTA-saturated).
            const float G = g1 * g1 * g1 * g1;
            const float S = g_s[0] * g1 * g1 * g1 + g_s[1] * g1 * g1 + g_s[2] * g1 + g_s[3];
            const float kFbScale = 4.20f * clampf((k - 2.5f) * 1.0f, 0.3f, 1.0f);
            const float fbSig = omega_softclip(S * kFbScale) / kFbScale;
            const float u = (input * comp - k * fbSig) / (1.0f + k * G);

            // 4-stage nonlinear integration.
            const float ota = otaScaleForFreq(frq, res);
            const float lp1 = nlStage(g_s[0], u,      gcoef, g1, ota);
            const float lp2 = nlStage(g_s[1], lp1,    gcoef, g1, ota);
            const float lp3 = nlStage(g_s[2], lp2,    gcoef, g1, ota);
            const float lp4 = nlStage(g_s[3], lp3,    gcoef, g1, ota);

            // Tap combinations.
            const float lp = lp4;
            const float hp = input - 4.0f * lp1 + 6.0f * lp2 - 4.0f * lp3 + lp4;
            const float bp = lp2 - lp4;
            const float notch = lp + hp;

            float out;
            switch (g_mode) {
                case 0: out = lp; break;
                case 1: out = hp; break;
                case 2: out = bp; break;
                default: out = notch; break;
            }

            // Denormal cleanup.
            for (int j = 0; j < 4; ++j) {
                if (g_s[j] < 1.0e-15f && g_s[j] > -1.0e-15f) g_s[j] = 0.0f;
            }

            buffer[i] = out;
            if (length == 1) buffer[VOICE_BUS_RIGHT] = out;
        }

        omega_publish_telemetry(0.0f);
    }

} // namespace

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { vcfInit(sampleRate); }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { vcfOnParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) { (void)status; (void)d1; (void)d2; }
    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) { vcfProcess(buffer, length); }
}
