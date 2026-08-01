/**
 * OMEGA WASM SDK - MIDI TRIGGER (#502)
 * Era 7.2.3 Industrial C++ Implementation
 * Performance-grade MIDI event generation.
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>

using namespace Omega::Constants;

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("midi_trigger", "Industrial MIDI Trigger")
    OMEGA_FAMILY("midi")
    OMEGA_PARAM(trigger,  "Trigger",   0, 1, 0, "bin")
    OMEGA_PARAM(note_idx, "Note",      0, 11, 0, "idx")
    OMEGA_PARAM(octave,   "Octave",    0, 10, 5, "idx") // Index 5 = Octave 3 (offset -2)
    OMEGA_PARAM(velocity, "Velocity",  0, 127, 100, "vel")
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
            case 0: // Trigger
                handleTrigger(value > 0.5f);
                break;
            case 1: // Note Index (0-11)
                mNoteIdx = static_cast<int>(value);
                break;
            case 2: // Octave Index (0-10) -> Maps to -2 to +8
                mOctaveValue = static_cast<int>(value) - 2;
                break;
            case 3: // Velocity (0-127)
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
        int noteNumber = (mOctaveValue + 1) * 12 + mNoteIdx;
        noteNumber = (noteNumber < 0) ? 0 : (noteNumber > 127 ? 127 : noteNumber);

        uint8_t velByte = static_cast<uint8_t>(mVelocity);
        
        if (active) {
            // Note On (Channel 1 -> 0x90)
            omega_publish_midi(0, 0x90, static_cast<uint8_t>(noteNumber), velByte);
            omega_publish_telemetry(TELEMETRY_FULL_SIGNAL);
        } else {
            // Note Off (Channel 1 -> 0x80)
            omega_publish_midi(0, 0x80, static_cast<uint8_t>(noteNumber), 0);
            omega_publish_telemetry(0.0f);
        }
    }

private:
    bool mIsTriggered = false;
    int mNoteIdx = 0;         // 0 = C
    int mOctaveValue = 3;     // Defaults to Octave 3
    float mVelocity = 100.0f; // Default velocity
};

static MidiTrigger g_trigger;

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { (void)sampleRate; }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { g_trigger.onParam(paramId, value); }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) { (void)status; (void)d1; (void)d2; }
    EMSCRIPTEN_KEEPALIVE void omega_process(const float* buffer, int length) { (void)buffer; (void)length; }
}
