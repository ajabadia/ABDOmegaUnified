/**
 * OMEGA WASM SDK - MIDI 2 CV Converter
 * Era 7.2.3 Industrial C++ Implementation (Zero-Dep)
 *
 * Convierte MIDI (Note On/Off, Pitch Bend) en CV / Gate / Velocity para la
 * vía de voz del host (omega_set_voice_*). Migrado desde el repositorio
 * legacy «ABDOmega plugins» (_historical/modules/midi_2_cv.cpp).
 *
 * LINKING NOTE: todo el DSP vive en un namespace anónimo (internal linkage).
 * Una clase con external linkage sería promovida por Emscripten SIDE_MODULE a
 * un IMPORT del propio símbolo (bug documentado en modules/440demo/440demo.cpp).
 * Los módulos solo IMPORTAN servicios del host (omega_publish_*, omega_set_*).
 *
 * PARAMS (parte del manifiesto — editables desde el frontal):
 *   midi_channel (Ch,  default 0) — canal MIDI (0 = omnicanal)
 *   glide_mode   (bin, default 0) — glide on/off
 *   glide_time   (ms,  default 0) — tiempo de glide
 *   bend_range   (st,  default 2) — rango de pitch bend en semitonos
 *   at_mode      (bin, default 0) — modo aftertouch (reservado)
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>

using namespace Omega::Constants;

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("midi_2_cv", "Pro MIDI-CV (Industrial)")
    OMEGA_FAMILY("control")
    OMEGA_PARAM(midi_channel, "MIDI Channel", 0, 16, 0, "Ch")
    OMEGA_PARAM(glide_mode,   "Glide Mode",   0, 1, 0, "bin")
    OMEGA_PARAM(glide_time,   "Glide Time",   0, 2000, 0, "ms")
    OMEGA_PARAM(bend_range,   "Pitch Bend",   0, 24, 2, "st")
    OMEGA_PARAM(at_mode,      "AT Mode",      0, 1, 0, "bin")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(cv_out,   "CV Out",    output, cv)
        OMEGA_PORT(gate_out, "Gate Out",  output, gate)
        OMEGA_PORT(vel_out,  "Velocity",  output, cv)
        OMEGA_PORT(at_out,   "Aftertouch", output, cv)
END_OMEGA_PARAMETERS

// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

extern "C" {
    WASM_IMPORT(omega_publish_telemetry) void omega_publish_telemetry(float value);
    WASM_IMPORT(omega_set_voice_freq)     void omega_set_voice_freq(float frequency);
    WASM_IMPORT(omega_set_voice_gate)     void omega_set_voice_gate(float gateSignal);
    WASM_IMPORT(omega_set_voice_vel)      void omega_set_voice_vel(float velocity);
    WASM_IMPORT(omega_set_voice_at)       void omega_set_voice_at(float pressure);
}

namespace {

    // Índices de parámetro del contrato (mismo orden que los OMEGA_PARAM).
    enum ParamId : int {
        kParamMidiChannel = 0,
        kParamGlideMode   = 1,
        kParamGlideTime   = 2,
        kParamBendRange   = 3,
        kParamAtMode      = 4,
    };

    // Sensibilidad del pitch bend frente al rango configurado (sin escalar 1:1).
    constexpr float PITCH_BEND_SENSITIVITY = 0.7F;

    // --- DSP state (internal linkage) ---
    float g_sampleRate = DEFAULT_SAMPLE_RATE;
    float g_currentFreq = CONCERT_A_FREQ;
    float g_targetFreq = CONCERT_A_FREQ;
    float g_baseFreq = CONCERT_A_FREQ;
    float g_bendOffset = 1.0F;
    float g_glideStep = 0.0F;

    int g_channel = 0;
    int g_glideMode = 0;
    float g_glideTimeMs = 0.0F;
    int g_bendRange = 2;
    int g_atMode = 0;

    float midiToHz(int note) {
        int clampedNote = note;
        if (clampedNote < 0) { clampedNote = 0; }
        if (clampedNote > static_cast<int>(MIDI_MAX_VALUE)) { clampedNote = static_cast<int>(MIDI_MAX_VALUE); }

        static const float SEMITONE_TABLE[SEMITONES_PER_OCTAVE] = {
            8.1757989156F, 8.6619572180F, 9.1770239974F, 9.7227182413F,
            10.3008611535F, 10.9133822323F, 11.5623257097F, 12.2498573744F,
            12.9782717994F, 13.7500000000F, 14.5676175474F, 15.4338531643F
        };

        const int octave = clampedNote / SEMITONES_PER_OCTAVE;
        const int semi = clampedNote % SEMITONES_PER_OCTAVE;
        float frequency = SEMITONE_TABLE[semi];

        for (int i = 0; i < octave; i++) {
            frequency *= 2.0F; // Octave doubling
        }
        return frequency;
    }

    void midiCvInit(float sampleRate) {
        g_sampleRate = sampleRate > 0.0F ? sampleRate : DEFAULT_SAMPLE_RATE;
        g_currentFreq = CONCERT_A_FREQ;
        g_targetFreq = CONCERT_A_FREQ;
        g_baseFreq = CONCERT_A_FREQ;
        g_bendOffset = 1.0F;
        g_glideStep = 0.0F;
        g_channel = 0;
        g_glideMode = 0;
        g_glideTimeMs = 0.0F;
        g_bendRange = 2;
        g_atMode = 0;
    }

    void midiCvOnParam(int paramId, float value) {
        switch (paramId) {
            case kParamMidiChannel: g_channel = static_cast<int>(value); break;
            case kParamGlideMode:   g_glideMode = static_cast<int>(value); break;
            case kParamGlideTime:   g_glideTimeMs = value; break;
            case kParamBendRange:   g_bendRange = static_cast<int>(value); break;
            case kParamAtMode:      g_atMode = static_cast<int>(value); break;
            default: break;
        }
    }

    void midiCvOnMidi(uint8_t status, uint8_t data1, uint8_t data2) {
        const uint8_t channel = (status & MIDI_CHANNEL_MASK) + 1;
        const uint8_t type = status & MIDI_STATUS_MASK;

        if (g_channel != 0 && g_channel != channel) {
            return;
        }

        omega_publish_telemetry(TELEMETRY_FULL_SIGNAL);

        if (type == MIDI_NOTE_ON && data2 > 0) {
            g_baseFreq = midiToHz(data1);
            g_targetFreq = g_baseFreq * g_bendOffset;

            if (g_glideTimeMs <= GLIDE_MIN_THRESHOLD) {
                g_currentFreq = g_targetFreq;
                omega_set_voice_freq(g_currentFreq);
            } else {
                const float delta = g_targetFreq - g_currentFreq;
                const float samples = (g_glideTimeMs / MS_TO_S_FACTOR) * g_sampleRate;
                g_glideStep = delta / (samples > 0.0F ? samples : 1.0F);
            }

            omega_set_voice_vel(static_cast<float>(data2) * MIDI_NORM_FACTOR);
            omega_set_voice_gate(TELEMETRY_FULL_SIGNAL);
        }
        else if (type == MIDI_NOTE_OFF || (type == MIDI_NOTE_ON && data2 == 0)) {
            omega_set_voice_gate(0.0F);
        }
        else if (type == MIDI_PITCH_BEND) {
            const auto bend = static_cast<uint16_t>((data2 << 7) | data1);
            const float normalized = static_cast<float>(static_cast<int>(bend) - MIDI_BEND_CENTER) * MIDI_BEND_NORM_FACTOR;

            // Bend range is in semitones.
            g_bendOffset = 1.0F + (normalized * (static_cast<float>(g_bendRange) / static_cast<float>(SEMITONES_PER_OCTAVE)) * PITCH_BEND_SENSITIVITY);
            g_targetFreq = g_baseFreq * g_bendOffset;

            if (g_glideTimeMs <= GLIDE_MIN_THRESHOLD) {
                g_currentFreq = g_targetFreq;
                omega_set_voice_freq(g_currentFreq);
            }
        }
    }

    void midiCvProcess(float* buffer, int length) {
        if (g_currentFreq != g_targetFreq) {
            for (int i = 0; i < length; i++) {
                g_currentFreq += g_glideStep;
                if ((g_glideStep > 0.0F && g_currentFreq > g_targetFreq) ||
                    (g_glideStep < 0.0F && g_currentFreq < g_targetFreq)) {
                    g_currentFreq = g_targetFreq;
                }
            }
            omega_set_voice_freq(g_currentFreq);
        }
        (void)buffer;
    }

} // namespace

// --- C-Linkage Exports ---
extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { midiCvInit(sampleRate); }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { midiCvOnParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t data1, uint8_t data2) { midiCvOnMidi(status, data1, data2); }
    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) { midiCvProcess(buffer, length); }
}
