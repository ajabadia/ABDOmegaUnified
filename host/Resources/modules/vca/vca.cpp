/**
 * OMEGA WASM SDK - VCA (#vca)
 * Phase A — Voltage-controlled amplifier (JUNO-106 80017A model).
 *
 * Aseptic modular convention (voice path): audio flows on bus 0 (L) and
 * bus 1 (R); the amplitude envelope arrives on the ENV bus (4) written by the
 * ADSR module. output = input * envDepth * level, where envDepth is the
 * ENV bus value scaled/curved per the params. A bipolar gate can be applied
 * via the gate_in port for modular patches without an ADSR.
 *
 * CONFIGURATION:
 *   level    (0..1) — output level (master VCA gain)
 *   env_depth (0..1) — how much of the ENV bus feeds the gain (0 = open gate)
 *   curve    (0..1) — gain response: 0 = linear, 1 = exponential (analog OTA)
 *   velocity (0..1) — velocity sensitivity (voice velocity scales the gain)
 *
 * Output convention:
 *   bus 0/1 — audio out (L/R), replaces the input on the chain
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
    WASM_IMPORT(omega_get_voice_velocity) float omega_get_voice_velocity(void);
    WASM_IMPORT(omega_publish_telemetry)  void   omega_publish_telemetry(float value);
}

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("vca", "Omega VCA")
    OMEGA_FAMILY("utility")
    OMEGA_PARAM(level,     "Level",     0.0, 1.0, 0.8, "amp")
    OMEGA_PARAM(env_depth, "Env Depth", 0.0, 1.0, 1.0, "amp")
    OMEGA_PARAM(curve,     "Curve",     0.0, 1.0, 0.5, "amp")
    OMEGA_PARAM(velocity,  "Velocity",  0.0, 1.0, 0.0, "amp")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(in,       "In",     input,  audio)
        OMEGA_PORT(gate_in,  "Gate",   input,  gate)
        OMEGA_PORT(out,      "Out",    output, audio)
END_OMEGA_PARAMETERS

namespace {

    enum ParamId : int {
        kParamLevel    = 0,
        kParamEnvDepth = 1,
        kParamCurve    = 2,
        kParamVelocity = 3,
    };

    // Phase A voice convention (see ADSR): ENV bus carries the envelope CV.
    constexpr int kBusEnvOut = 4;
    constexpr int kBusGateIn = 13;

    // --- DSP state (internal linkage) ---
    float g_level     = 0.8f;
    float g_envDepth  = 1.0f;
    float g_curve     = 0.5f;
    float g_velocity  = 0.0f;

    void vcaInit(float sampleRate) {
        (void)sampleRate;
        g_level = 0.8f;
        g_envDepth = 1.0f;
        g_curve = 0.5f;
        g_velocity = 0.0f;
    }

    void vcaOnParam(int paramId, float value) {
        switch (paramId) {
            case kParamLevel:    g_level = value < 0.0f ? 0.0f : (value > 1.0f ? 1.0f : value); break;
            case kParamEnvDepth: g_envDepth = value < 0.0f ? 0.0f : (value > 1.0f ? 1.0f : value); break;
            case kParamCurve:    g_curve = value < 0.0f ? 0.0f : (value > 1.0f ? 1.0f : value); break;
            case kParamVelocity: g_velocity = value < 0.0f ? 0.0f : (value > 1.0f ? 1.0f : value); break;
            default: break;
        }
    }

    void vcaProcess(float* buffer, int length) {
        for (int i = 0; i < length; ++i) {
            const float input = buffer[i];
            const float env   = (length == 1) ? buffer[kBusEnvOut] : 0.0f;
            const bool  gateCv = (length == 1) && (buffer[kBusGateIn] > BIN_ON_THRESHOLD);

            // Envelope depth: envDepth 0 = gate-only (audio passes while gated).
            float gain = env * g_envDepth;
            if (gateCv) gain = (gain > 1.0f) ? gain : 1.0f; // gate forces open

            // Curved response: 0 linear, 1 exponential (OTA-like).
            if (g_curve > 0.0f) {
                const float expo = omega_pow(gain, 1.0f + g_curve * 2.0f);
                gain = gain * (1.0f - g_curve) + expo * g_curve;
            }

            // Velocity sensitivity: scale with voice velocity.
            const float vel = omega_get_voice_velocity();
            gain *= 1.0f + g_velocity * (vel - 1.0f);

            gain *= g_level;
            if (gain < 0.0f) gain = 0.0f;

            const float out = input * gain;
            buffer[i] = out;
            if (length == 1) buffer[VOICE_BUS_RIGHT] = buffer[VOICE_BUS_RIGHT] * gain;
        }

        omega_publish_telemetry(0.0f);
    }

} // namespace

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { vcaInit(sampleRate); }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { vcaOnParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) { (void)status; (void)d1; (void)d2; }
    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) { vcaProcess(buffer, length); }
}
