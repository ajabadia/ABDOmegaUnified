/** 
 * @file OmegaContract.h 
 * @warning ESTE ARCHIVO ES UNA COPIA SINCRONIZADA. 
 * NO EDITAR ESTE ARCHIVO. Las ediciones deben realizarse en: 
 * D:\desarrollos\ABDOmega\src\Core\Ace\OmegaContract.h 
 * y luego ejecutar este script (scripts\sync_sdk.bat) 
 */ 
 
#pragma once

#include <stdint.h>

/**
 * @file OmegaContract.h
 * @brief Infraestructura de autodescripción para módulos OMEGA Era 7.
 * 
 * Versión Industrial Ultra-Ligera (Zero Dependencies).
 * Fuerza el uso de minúsculas en identificadores técnicos para compatibilidad con WebUI.
 */

#ifndef EMSCRIPTEN_KEEPALIVE
#define EMSCRIPTEN_KEEPALIVE
#endif

#ifdef __cplusplus
extern "C" {
    // Host Imports
    extern float omega_get_sample_rate();
    extern int   omega_get_block_size();
    extern int   omega_get_midi_protocol();
    extern void* omega_get_system_buffer(const char* systemId);
    extern void  omega_publish_telemetry(float val);
    extern void  omega_publish_midi(uint32_t port, uint8_t status, uint8_t d1, uint8_t d2);
    extern void  omega_log(const char* msg);
    extern void  omega_log_terminal(const char* bindId, const char* message);

    // Lifecycle Exports
    EMSCRIPTEN_KEEPALIVE const char* omega_get_contract(); // NOLINT(modernize-use-trailing-return-type)
}
#endif

// --- Macros de Generación (C++) ---

#ifdef __cplusplus
#define BEGIN_OMEGA_PARAMETERS(moduleId, moduleName) \
    extern "C" { \
        EMSCRIPTEN_KEEPALIVE \
        const char* omega_get_contract() { /* NOLINT(modernize-use-trailing-return-type, readability-function-cognitive-complexity) */ \
            static char json[4096]; \
            static bool initialized = false; \
            if (initialized) return json; \
            int pos = 0; \
            const char* currentFamily = "utility"; \
            auto append = [&](const char* str) { while (*str) json[pos++] = *str++; }; \
            auto appendLower = [&](const char* str) { \
                while (*str) { \
                    char chr = *str++; \
                    json[pos++] = (chr >= 'A' && chr <= 'Z') ? (static_cast<char>(chr + 32)) : chr; \
                } \
            }; \
            auto appendInt = [&](int number) { \
                if (number == 0) { json[pos++] = '0'; return; } \
                if (number < 0) { json[pos++] = '-'; number = -number; } \
                char buffer[12]; int bPosition = 0; \
                while (number > 0) { buffer[bPosition++] = (number % 10) + '0'; number /= 10; } \
                while (bPosition > 0) json[pos++] = buffer[--bPosition]; \
            }; \
            auto appendFloat = [&](float value) { \
                int integerPart = static_cast<int>(value); appendInt(integerPart); \
                json[pos++] = '.'; \
                int fractionalPart = static_cast<int>((value - static_cast<float>(integerPart)) * 100.0F); \
                if (fractionalPart < 0) fractionalPart = -fractionalPart; \
                if (fractionalPart < 10) json[pos++] = '0'; \
                appendInt(fractionalPart); \
            }; \
            append("{\"version\":\"7.0\",\"id\":\""); appendLower(moduleId); \
            append("\",\"name\":\"" moduleName "\",\"parameters\":["); \
            bool firstParam = true;

#define OMEGA_FAMILY(familyName) currentFamily = familyName;

#define OMEGA_PARAM(id, label, min, max, def, unit) \
            if (!firstParam) append(","); \
            append("{\"id\":\""); appendLower(#id); \
            append("\",\"label\":\"" label "\",\"min\":"); \
            appendFloat(min); \
            append(",\"max\":"); \
            appendFloat(max); \
            append(",\"default\":"); \
            appendFloat(def); \
            append(",\"unit\":\"" unit "\"}"); \
            firstParam = false;

#define BEGIN_OMEGA_PORTS \
            append("],\"ports\":["); \
            bool firstPort = true;

#define OMEGA_PORT(id, label, dir, type) \
            if (!firstPort) append(","); \
            append("{\"id\":\""); appendLower(#id); \
            append("\",\"label\":\"" label "\",\"direction\":\""); \
            appendLower(#dir); \
            append("\",\"type\":\""); \
            appendLower(#type); \
            append("\"}"); \
            firstPort = false;

#define END_OMEGA_PARAMETERS \
            append("],\"family\":\""); \
            appendLower(currentFamily); \
            append("\"}"); \
            json[pos] = '\0'; \
            initialized = true; \
            return json; \
        } \
    }
#else
// C version simplified (legacy)
#define BEGIN_OMEGA_PARAMETERS(moduleId, moduleName) \
    const char* omega_get_contract() { \
        return "{\"version\":\"7.0\",\"id\":\"" moduleId "\",\"name\":\"" moduleName "\",\"parameters\":[]}"; \
    }
#define OMEGA_FAMILY(x)
#define OMEGA_PARAM(a,b,c,d,e,f)
#define BEGIN_OMEGA_PORTS
#define OMEGA_PORT(a,b,c,d)
#define END_OMEGA_PARAMETERS
#endif
