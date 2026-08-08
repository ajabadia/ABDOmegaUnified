/**
 * OMEGA WASM SDK - MIDI TRIGGER (#502)
 * Era 7.2.3 Industrial C++ Implementation
 * Performance-grade MIDI event generation.
 *
 * CONFIGURATION (parte del manifiesto — editables desde el frontal):
 *   trigger  (bin)  — pulso momentáneo (Note On/Off)
 *   note_idx (idx)  — índice de nota dentro de la octava (0..11)
 *   octave   (idx)  — índice de octava (0..10, default 5) → octava real -2..+8
 *   velocity (vel)  — intensidad del disparo (0..127, default 100)
 * Los defaults y el offset de octava derivan de constantes (única fuente).
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>

using namespace Omega::Constants;

// Índices de parámetro del contrato (mismo orden que los OMEGA_PARAM).
enum ParamId : int {
    kParamTrigger  = 0,
    kParamNoteIdx  = 1,
    kParamOctave   = 2,
    kParamVelocity = 3,
};

// Mapeo octava: el contrato expone un ÍNDICE (0-10, default 5) y el DSP lo
// traduce a la octava real desplazada (-2..+8). El offset y el default del
// índice son la fuente única (contrato + estado interno derivan de aquí).
constexpr int kOctaveIndexOffset = -2;
constexpr int kOctaveIndexDefault = 5;   // -> octava real 3 (C4 = 60)
constexpr int kNoteIdxDefault = 0;       // == default del contrato (0 = C)
constexpr float kVelocityDefault = 100.0F; // == default del contrato

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("midi_trigger", "Industrial MIDI Trigger")
    OMEGA_FAMILY("midi")
    OMEGA_PARAM(trigger,  "Trigger",   0, 1, 0, "bin")
    OMEGA_PARAM(note_idx, "Note",      0, SEMITONES_PER_OCTAVE - 1, kNoteIdxDefault, "idx")
    OMEGA_PARAM(octave,   "Octave",    0, 10, kOctaveIndexDefault, "idx")
    OMEGA_PARAM(velocity, "Velocity",  0, MIDI_MAX_VALUE, kVelocityDefault, "vel")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(midi_out, "MIDI Out", output, midi)
END_OMEGA_PARAMETERS

// --- Host Interface ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

extern "C" {
    WASM_IMPORT(omega_publish_telemetry) void omega_publish_telemetry(float value);
    WASM_IMPORT(omega_publish_midi)      void omega_publish_midi(uint32_t port, uint8_t status, uint8_t data1, uint8_t data2);
}

/**
 * @brief MIDI Trigger Logic Engine
 */
class MidiTrigger {
public:
    MidiTrigger() = default;

    void onParam(int paramId, float value) {
        switch(paramId) {
            case kParamTrigger: // Trigger
                handleTrigger(value > BIN_ON_THRESHOLD);
                break;
            case kParamNoteIdx: // Note Index (0-11)
                mNoteIdx = static_cast<int>(value);
                break;
            case kParamOctave: // Octave Index (0-10) -> Maps to -2 to +8
                mOctave = static_cast<int>(value) + kOctaveIndexOffset;
                break;
            case kParamVelocity: // Velocity (0-127)
                mVelocity = value;
                break;
            default: break;
        }
    }

    void handleTrigger(bool active) {
        if (active == mIsTriggered) return;
        mIsTriggered = active;

        // Calculate MIDI Note Number (C4 = 60)
        // Formula: (Octave + 1) * 12 + NoteIndex
        int noteNumber = (mOctave + 1) * SEMITONES_PER_OCTAVE + mNoteIdx;
        if (noteNumber < 0) noteNumber = 0;
        else if (noteNumber > MIDI_MAX_VALUE) noteNumber = MIDI_MAX_VALUE;

        uint8_t velByte = static_cast<uint8_t>(mVelocity);

        if (active) {
            // Note On (Channel 1)
            omega_publish_midi(MIDI_PORT_MAIN, MIDI_NOTE_ON, static_cast<uint8_t>(noteNumber), velByte);
            omega_publish_telemetry(TELEMETRY_FULL_SIGNAL);
        } else {
            // Note Off (Channel 1)
            omega_publish_midi(MIDI_PORT_MAIN, MIDI_NOTE_OFF, static_cast<uint8_t>(noteNumber), 0);
            omega_publish_telemetry(TELEMETRY_OFF);
        }
    }

private:
    bool mIsTriggered = false;
    int mNoteIdx = kNoteIdxDefault;                          // == default del contrato (0 = C)
    int mOctave = kOctaveIndexDefault + kOctaveIndexOffset;  // Octava 3 por defecto (== default del contrato)
    float mVelocity = kVelocityDefault;                      // == default del contrato
};

static MidiTrigger g_trigger;

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { (void)sampleRate; }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { g_trigger.onParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) { (void)status; (void)d1; (void)d2; }
    EMSCRIPTEN_KEEPALIVE void omega_process(const float* buffer, int length) { (void)buffer; (void)length; }
}
