/**
 * OMEGA WASM SDK - MIDI IN Bridge (#501)
 * Era 7.2.3 Industrial C++ Implementation
 * Gold Standard Compliance - ZERO NOISE Audit
 */

#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>

using namespace Omega::Constants;

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("midi_in", "Global MIDI Input")
    OMEGA_FAMILY("io")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(midi_out, "MIDI Data", output, midi)
        OMEGA_PORT(led_activity, "Activity", output, led)
END_OMEGA_PARAMETERS

// --- Host Interface ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

extern "C" {
    WASM_IMPORT(omega_publish_telemetry) void omega_publish_telemetry(float value);
    WASM_IMPORT(omega_publish_midi)      void omega_publish_midi(uint32_t port, uint8_t status, uint8_t data1, uint8_t data2);
}

/**
 * @brief Global state for the bridge
 */
struct {
    float sampleRate = DEFAULT_SAMPLE_RATE;
} g_state;

extern "C" {
    /**
     * @brief MIDI Event Hook (Gold Standard v7.2.3)
     */
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t data1, uint8_t data2) { // NOLINT(bugprone-easily-swappable-parameters)
        // 1. Forward MIDI data to the output port
        omega_publish_midi(0, status, data1, data2);

        // 2. Pulse activity LED (Telemetry)
        omega_publish_telemetry(TELEMETRY_FULL_SIGNAL);
    }

    EMSCRIPTEN_KEEPALIVE void omega_process(const float* buffer, int length) {
        // Pure MIDI bridge: Audio processing is no-op
        (void)buffer;
        (void)length;
    }

    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { // NOLINT(bugprone-easily-swappable-parameters)
        // No parameters for the aseptic MIDI Bridge
        (void)paramId;
        (void)value;
    }

    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) {
        g_state.sampleRate = sampleRate;
    }
}
