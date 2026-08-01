#pragma once

#include <stdint.h>

namespace Omega::Constants {

    // MIDI Status Bytes
    constexpr uint8_t MIDI_NOTE_OFF         = 0x80;
    constexpr uint8_t MIDI_NOTE_ON          = 0x90;
    constexpr uint8_t MIDI_POLY_AFTERTOUCH  = 0xA0;
    constexpr uint8_t MIDI_CONTROL_CHANGE   = 0xB0;
    constexpr uint8_t MIDI_PROGRAM_CHANGE   = 0xC0;
    constexpr uint8_t MIDI_CHANNEL_PRESSURE = 0xD0;
    constexpr uint8_t MIDI_PITCH_BEND       = 0xE0;
    constexpr uint8_t MIDI_SYSTEM_MESSAGE   = 0xF0;

    // MIDI Masks & Limits
    constexpr uint8_t MIDI_CHANNEL_MASK     = 0x0F;
    constexpr uint8_t MIDI_STATUS_MASK      = 0xF0;
    constexpr uint8_t MIDI_MAX_VALUE        = 127;
    constexpr float   MIDI_NORM_FACTOR      = 1.0F / 127.0F;
    constexpr uint16_t MIDI_BEND_CENTER     = 8192;
    constexpr float   MIDI_BEND_NORM_FACTOR = 1.0F / 8192.0F;

    // Audio & DSP
    constexpr float   DEFAULT_SAMPLE_RATE   = 44100.0F;
    constexpr float   CONCERT_A_FREQ        = 440.0F;
    constexpr int     SEMITONES_PER_OCTAVE  = 12;
    constexpr float   TELEMETRY_FULL_SIGNAL = 1.0F;
    constexpr float   GLIDE_MIN_THRESHOLD   = 0.001F;
    constexpr float   MS_TO_S_FACTOR        = 1000.0F;

} // namespace Omega::Constants
