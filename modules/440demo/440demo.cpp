/**
 * OMEGA WASM SDK - 440 DEMO (#5xx)
 * Era 7.2.3 Industrial C++ Implementation
 * Fixed 440 Hz (A4) test-tone generator with on/off switch and activity LED.
 *
 * Zero-stdlib: the sine wave uses Bhaskara I's rational approximation
 * (no <cmath>/libm dependency — SIDE_MODULE builds must not import math).
 *
 * LINKING NOTE: all DSP lives in an anonymous namespace (internal linkage).
 * A class member function with external linkage gets promoted by Emscripten's
 * SIDE_MODULE shared-symbol resolution to an IMPORT of the module's own
 * symbol (verified via llvm-objdump: `omega_process` called the imported
 * `_ZN7Tone4407processEPfi` no-op instead of the local definition). Host
 * modules must only IMPORT host services (omega_publish_*) — never their
 * own symbols.
 *
 * CONFIGURATION (parte del manifiesto — editables desde el frontal):
 *   enabled   (bin,  default 1)     — switch ON/OFF del tono
 *   amplitude (amp,  default 0.5)   — amplitud del tono (0..1)
 *   led_rate  (hz,   default 8)     — cadencia del S&H del LED de actividad
 * Los defaults derivan de Omega::Constants (única fuente) y el DSP arranca
 * con los valores canónicos del contrato.
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>

using namespace Omega::Constants;

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("440demo", "440 Hz Test Tone")
    OMEGA_FAMILY("utility")
    OMEGA_PARAM(enabled,   "Enable",    0, 1, 1,                      "bin")
    OMEGA_PARAM(amplitude, "Amplitude", 0.0, 1.0, TONE_AMPLITUDE_DEFAULT, "amp")
    OMEGA_PARAM(led_rate,  "LED Rate",  1.0, 30.0, LED_HOLD_RATE_HZ_DEFAULT, "hz")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(audio_out,    "Tone Out", output, audio)
        OMEGA_PORT(led_activity, "Activity", output, led)
END_OMEGA_PARAMETERS

// --- Host Interface ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

extern "C" {
    WASM_IMPORT(omega_publish_telemetry) void omega_publish_telemetry(float value);
}

namespace {

    // Índices de parámetro del contrato (mismo orden que los OMEGA_PARAM).
    enum ParamId : int {
        kParamEnabled   = 0,
        kParamAmplitude = 1,
        kParamLedRate   = 2,
    };

    // Cadencia del LFO del LED (Hz) — 3 y 8 son COPRIMOS, así el fasor
    // muestreado deriva cada hold y el brillo oscila visiblemente. Muestrear
    // la senoide de 440 Hz a 8 Hz fijaría la fase a 440/8 = 55 ciclos por
    // hold -> |sin(0)| = 0 siempre (LED congelado apagado).
    constexpr float kLedLfoHz = 3.0f;

    // Vía de voz del host: buffer = 16 buses float, length == 1 (bus 0 = L,
    // bus 1 = R). La ruta de bloque (length > 1) escribe en el banco de señal.
    constexpr int kVoicePathLength = 1;

    // Coeficientes de la aproximación de Bhaskara I:
    // sin(x) ~= 16x(pi-x) / (5pi^2 - 4x(pi-x))  para 0 <= x <= pi
    constexpr float kBhaskaraNumerator   = 16.0f;
    constexpr float kBhaskaraDenomFactor = 5.0f;
    constexpr float kBhaskaraDenomSub    = 4.0f;

    /**
     * @brief Sine via Bhaskara I rational approximation (error < 1e-3).
     * No libm imports — safe for Emscripten SIDE_MODULE builds.
     */
    float sinApprox(float x) {
        // Reduce to [-PI, PI]
        while (x > PI)  x -= TAU;
        while (x < -PI) x += TAU;

        if (x < 0.0f) return -sinApprox(-x);
        const float pimx = PI - x;
        return (kBhaskaraNumerator * x * pimx) /
               (kBhaskaraDenomFactor * PI * PI - kBhaskaraDenomSub * x * pimx);
    }

    // --- DSP state (internal linkage — keeps the wasm free of self-imports) ---
    float g_sampleRate = DEFAULT_SAMPLE_RATE;
    float g_phase = 0.0f;
    float g_lfoPhase = 0.0f;
    bool g_enabled = true; // Default ON: sounds as soon as the module is loaded
    float g_amplitude = TONE_AMPLITUDE_DEFAULT;   // == default del contrato (0.5)
    float g_ledHoldHz = LED_HOLD_RATE_HZ_DEFAULT; // == default del contrato (8 Hz)
    uint32_t g_sampleCounter = 0;

    void toneInit(float sampleRate) {
        g_sampleRate = sampleRate > 0.0f ? sampleRate : DEFAULT_SAMPLE_RATE;
        g_phase = 0.0f;
        g_lfoPhase = 0.0f;
        g_enabled = true;
        g_amplitude = TONE_AMPLITUDE_DEFAULT;
        g_ledHoldHz = LED_HOLD_RATE_HZ_DEFAULT;
        g_sampleCounter = 0;
    }

    void toneOnParam(int paramId, float value) {
        switch (paramId) {
            case kParamEnabled:
                g_enabled = (value > BIN_ON_THRESHOLD);
                break;
            case kParamAmplitude:
                // Clamp defensivo (el rango del contrato ya es 0..1).
                g_amplitude = value < 0.0f ? 0.0f : (value > 1.0f ? 1.0f : value);
                break;
            case kParamLedRate:
                // Guard contra división por cero en el S&H (contrato min 1 Hz).
                if (value > 0.0f) g_ledHoldHz = value;
                break;
            default:
                break;
        }
    }

    /**
     * @brief Renders the tone into the caller's bus buffer (zero-copy).
     * Voice path: buffer = 16-float voice buses, length == 1; bus 0 = L, bus 1 = R.
     * Writes the same sample into both buses so the test tone is audible
     * regardless of the host's channel extraction.
     */
    void toneProcess(float* buffer, int length) {
        const float step = TAU * CONCERT_A_FREQ / g_sampleRate;
        const float lfoStep = TAU * kLedLfoHz / g_sampleRate;

        // NOTE: with length > 1 (global modulation rack path) the sine is written
        // across the first `length` samples of the signal bank — acceptable for a
        // demo tone module; the voice path always calls with length == 1.
        for (int i = 0; i < length; ++i) {
            const float sample = g_enabled ? (g_amplitude * sinApprox(g_phase)) : 0.0f;
            g_phase += step;
            if (g_phase >= TAU) g_phase -= TAU;
            g_lfoPhase += lfoStep;
            if (g_lfoPhase >= TAU) g_lfoPhase -= TAU;

            buffer[i] = sample; // bus 0 (L)
            if (length == kVoicePathLength) buffer[VOICE_BUS_RIGHT] = sample; // voice path: also bus 1 (R)
        }

        // Activity LED: sample & hold at g_ledHoldHz of a rectified 3 Hz LFO (see
        // the kLedLfoHz note — coprime rates keep the sampled phase drifting, so
        // the LED visibly pulses instead of freezing at one value). 440 Hz itself
        // is far above flicker-fusion, so the LFO drives the visible rhythm.
        // Counter accumulates SAMPLES (length), not calls — keeps the cadence on
        // both the voice path (length == 1 per sample) and the block path.
        g_sampleCounter += (uint32_t)length;
        if (g_sampleCounter >= (uint32_t)(g_sampleRate / g_ledHoldHz)) {
            g_sampleCounter = 0;
            float ledValue = 0.0f;
            if (g_enabled) {
                const float s = sinApprox(g_lfoPhase);
                ledValue = s < 0.0f ? -s : s;
            }
            omega_publish_telemetry(ledValue);
        }
    }

} // namespace

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { toneInit(sampleRate); }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { toneOnParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) { (void)status; (void)d1; (void)d2; }
    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) { toneProcess(buffer, length); }
}
