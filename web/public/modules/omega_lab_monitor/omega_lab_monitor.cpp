#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>

using namespace Omega::Constants;

/**
 * OMEGA LAB MONITOR - Era 7.2.3 Industrial (Zero-StdLib Version)
 */

extern "C" {
    void omega_log_terminal(const char* bindId, const char* message);
    void omega_publish_telemetry(float val);
}

BEGIN_OMEGA_PARAMETERS("omega_lab_monitor", "OMEGA LAB MONITOR")
    OMEGA_FAMILY("utility")
    OMEGA_PARAM(zoom,   "Zoom",   0.1, 10.0, 1.0, "x")
    OMEGA_PARAM(filter, "Filter", 0, 1, 0, "bin")
    OMEGA_PARAM(clear,  "Clear",  0, 1, 0, "bin")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(audio_in,    "Audio In",    input,  audio)
        OMEGA_PORT(midi_events, "MIDI events", input,  midi)
END_OMEGA_PARAMETERS

#define SCOPE_SIZE 1024
float g_scope_buffer[SCOPE_SIZE];
int g_write_ptr = 0;

float mZoom = 1.0f;
bool mFilterActive = false;

// --- Manual String Helpers (Zero-StdLib) ---
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

void logMidiToTerminal(uint8_t status, uint8_t d1, uint8_t d2) {
    char msg[64];
    char n_buf[12];
    uint8_t type = status & 0xF0;
    uint8_t channel = (status & 0x0F) + 1;

    int pos = 0;
    auto append = [&](const char* s) { while (*s) msg[pos++] = *s++; };
    
    append("[CH "); itoa_simple(channel, n_buf); append(n_buf); append("] ");

    if (type == 0x90 && d2 > 0) {
        append("NOTE ON: "); itoa_simple(d1, n_buf); append(n_buf);
        append(" (Vel: "); itoa_simple(d2, n_buf); append(n_buf); append(")");
    } else if (type == 0x80 || (type == 0x90 && d2 == 0)) {
        append("NOTE OFF: "); itoa_simple(d1, n_buf); append(n_buf);
    } else if (type == 0xB0) {
        append("CC: "); itoa_simple(d1, n_buf); append(n_buf);
        append(" Val: "); itoa_simple(d2, n_buf); append(n_buf);
    } else {
        append("OTHER EVENT");
    }
    
    msg[pos] = '\0';
    omega_log_terminal("midi_events", msg);
}

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) {
        for(int i=0; i<SCOPE_SIZE; i++) g_scope_buffer[i] = 0.0f;
        omega_log_terminal("midi_events", "--- OMEGA LAB MONITOR SYSTEM READY ---");
    }

    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) {
        switch (paramId) {
            case 0: mZoom = value; break;
            case 1: mFilterActive = (value > 0.5f); break;
            case 2: if (value > 0.5f) omega_log_terminal("midi_events", "--- LOG CLEARED ---"); break;
        }
    }

    EMSCRIPTEN_KEEPALIVE void omega_process(const float* buffer, int length) {
        for (int i = 0; i < length; ++i) {
            g_scope_buffer[g_write_ptr] = buffer[i];
            g_write_ptr = (g_write_ptr + 1) % SCOPE_SIZE;
        }
    }

    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) {
        if (mFilterActive) {
            uint8_t type = status & 0xF0;
            if (type != 0x90 && type != 0x80) return;
        }
        logMidiToTerminal(status, d1, d2);
    }

    EMSCRIPTEN_KEEPALIVE float* omega_get_scope_ptr() {
        return g_scope_buffer;
    }
}
