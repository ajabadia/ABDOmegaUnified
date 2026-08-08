/**
 * OMEGA LAB MONITOR - Era 7.2.3 Industrial (Zero-StdLib Version)
 *
 * Oscilloscope / voltmeter / clip detector monitor aligned with the
 * industrial panel described in omega_lab_monitor.acemm:
 *
 *   Params  (knobs):  timebase (TIME/DIV), gain (VOLT/DIV),
 *                     offset (OFFSET), mode (MODE)
 *   Ports   (jacks):  audio_in (AUDIO), cv_in (CV IN), thru_out (THRU),
 *                     trig_in (TRIG)
 *   Telemetry binds:  signal_telemetry (display), clip_status (LED)
 *
 * Zero-stdlib: scope capture + RMS/peak estimation + clip detection only.
 * All DSP lives in an anonymous namespace (internal linkage) so the wasm
 * only imports host services (omega_publish_*) — never its own symbols
 * (SIDE_MODULE self-import pattern documented in modules/440demo).
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>

using namespace Omega::Constants;

// Índices de parámetro del contrato (mismo orden que los OMEGA_PARAM).
enum ParamId : int {
    kParamTimebase = 0,
    kParamGain     = 1,
    kParamOffset   = 2,
    kParamMode     = 3,
};

// Constantes del módulo (definidas aquí — única fuente para estado y contrato).
constexpr int   kScopeSize = 1024;               // tamaño del buffer del osciloscopio
constexpr int   kNumBufSize = 12;                // buffer de dígitos itoa (int32 + signo + NUL)
constexpr float kTimebaseDefault = 1.0F;         // == default del contrato (1.0x)
constexpr float kGainDefault     = 1.0F;         // == default del contrato (1.0 V/div)
constexpr float kOffsetDefault   = 0.0F;         // == default del contrato (centrado)
constexpr float kModeDefault     = 0.0F;         // == default del contrato (modo 0)
constexpr float kClipThreshold   = 0.95F;        // |sample| >= umbral => CLIP
constexpr int   kTelemetryStride = 1024;         // muestras entre publicaciones de telemetría

float g_scope_buffer[kScopeSize];
int   g_write_ptr = 0;

float g_timebase = kTimebaseDefault;
float g_gain     = kGainDefault;
float g_offset   = kOffsetDefault;
float g_mode     = kModeDefault;
float g_signalPeak = 0.0F;
int   g_telemetryCounter = 0;

extern "C" {
    void omega_log_terminal(const char* bindId, const char* message);
    void omega_publish_telemetry(float val);
}

BEGIN_OMEGA_PARAMETERS("omega_lab_monitor", "OMEGA LAB TELEMETRY MONITOR")
    OMEGA_FAMILY("utility")
    OMEGA_PARAM(timebase, "Time/Div", 0.1, 10.0, kTimebaseDefault, "x")
    OMEGA_PARAM(gain,     "Volt/Div", 0.1, 10.0, kGainDefault,     "v")
    OMEGA_PARAM(offset,   "Offset",   -1.0, 1.0, kOffsetDefault,   "v")
    OMEGA_PARAM(mode,     "Mode",     0, 3, kModeDefault,         "idx")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(audio_in,         "Audio In",          input,  audio)
        OMEGA_PORT(cv_in,            "CV In",             input,  cv)
        OMEGA_PORT(thru_out,         "Thru Out",          output, audio)
        OMEGA_PORT(trig_in,          "Trig In",           input,  gate)
        OMEGA_PORT(signal_telemetry, "Signal Telemetry",  output, led)
        OMEGA_PORT(clip_status,      "Clip Status",       output, led)
END_OMEGA_PARAMETERS

// --- Manual String Helpers (Zero-StdLib) ---
namespace {

void itoa_simple(int n, char* s) {
    int i = 0, sign;
    if ((sign = n) < 0) n = -n;
    do { s[i++] = n % 10 + '0'; } while ((n /= 10) > 0);
    if (sign < 0) s[i++] = '-';
    s[i] = '\0';
    // Reverse
    for (int j = 0, k = i-1; j < k; j++, k--) {
        char temp = s[j]; s[j] = s[k]; s[k] = temp;
    }
}

    /**
     * @brief Captura la señal entrante en el buffer del osciloscopio y
     * reenvía la entrada a la salida THRU (passthrough). El buffer es el
     * banco de señales completo del host (voice path: 16 buses, length == 1;
     * block path: banco de kMaxSignals). audio_in == bus 0 (L).
     */
    void monitorProcess(float* buffer, int length) {
        for (int i = 0; i < length; ++i) {
            const float s = buffer[i];
            g_scope_buffer[g_write_ptr] = s;
            g_write_ptr = (g_write_ptr + 1) % kScopeSize;

            // Detección de pico (voltaje) para el display VOLTAGE / FREQ.
            const float absS = s < 0.0F ? -s : s;
            if (absS > g_signalPeak) g_signalPeak = absS;

            // THRU: passthrough (el buffer es el banco; no alteramos la señal).
            buffer[i] = s;
        }

        // Telemetría cada kTelemetryStride muestras: publicar el voltaje pico
        // de la ventana (display) y señalizar CLIP al LED cuando se exceda el
        // umbral. `omega_publish_telemetry` es el único canal de telemetría del
        // host (limitación pre-existente: registra midi_in.activity).
        g_telemetryCounter += length;
        if (g_telemetryCounter >= kTelemetryStride) {
            g_telemetryCounter = 0;
            const float voltage = g_signalPeak;
            g_signalPeak = 0.0F;
            omega_publish_telemetry(voltage);
            if (voltage >= kClipThreshold) {
                char buf[64];
                char n[kNumBufSize];
                itoa_simple((int)(voltage * 100.0F), n);
                int pos = 0;
                auto append = [&](const char* s) { while (*s) buf[pos++] = *s++; };
                append("CLIP DETECTED (peak ");
                append(n);
                append("00mV)");
                buf[pos] = '\0';
                omega_log_terminal("clip_status", buf);
            }
        }
    }

} // namespace

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) {
        (void)sampleRate;
        for (int i = 0; i < kScopeSize; i++) g_scope_buffer[i] = 0.0f;
        g_write_ptr = 0;
        g_timebase = kTimebaseDefault;
        g_gain     = kGainDefault;
        g_offset   = kOffsetDefault;
        g_mode     = kModeDefault;
        g_signalPeak = 0.0F;
        g_telemetryCounter = 0;
        omega_log_terminal("signal_telemetry", "--- OMEGA LAB MONITOR SYSTEM READY ---");
    }

    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) {
        switch (paramId) {
            case kParamTimebase: g_timebase = value; break;
            case kParamGain:     g_gain = value;     break;
            case kParamOffset:   g_offset = value;   break;
            case kParamMode:     g_mode = value;     break;
            default: break;
        }
    }

    EMSCRIPTEN_KEEPALIVE void omega_process(const float* buffer, int length) {
        monitorProcess(const_cast<float*>(buffer), length);
    }

    EMSCRIPTEN_KEEPALIVE float* omega_get_scope_ptr() {
        return g_scope_buffer;
    }
}
