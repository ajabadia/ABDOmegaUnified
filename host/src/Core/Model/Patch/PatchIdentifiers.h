#pragma once

#include <cstdint>

namespace Omega {
namespace Core {
namespace Model {

    /**
     * @brief Identificadores canónicos de Tipos de Módulo (Era 7).
     * Mapeados desde los manifests JSON/YAML.
     */
    enum class ModuleTypeId : uint16_t {
        None = 0,
        JunoDCO = 1,
        JpOscillator = 2,
        KorgVCO = 3,
        VaOscillator = 4,
        
        JunoFilter = 10,
        JpFilter = 11,
        KorgFilter = 12,
        
        EnvelopeAdsr = 20,
        LfoVA = 21,
        
        MasterDelay = 100,
        ChorusPool = 101,
        SpaceEcho = 102,
        
        // System / IO
        MidiIn = 500,
        
        // Validation / Utility
        TestParity = 999
    };

    /**
     * @brief Convierte un ID numérico de la Era 7 a su identificador de catálogo (string).
     */
    inline std::string mapTypeToId(ModuleTypeId typeId) {
        switch (typeId) {
            case ModuleTypeId::JunoDCO:      return "osc_juno_dco";
            case ModuleTypeId::JpOscillator: return "osc_jp_8000";
            case ModuleTypeId::KorgVCO:      return "osc_korg_ms20";
            case ModuleTypeId::VaOscillator: return "osc_va_basic";
            case ModuleTypeId::JunoFilter:   return "flt_juno_ir3109";
            case ModuleTypeId::JpFilter:     return "flt_jp_8000";
            case ModuleTypeId::KorgFilter:   return "flt_korg_35";
            case ModuleTypeId::EnvelopeAdsr: return "env_adsr_va";
            case ModuleTypeId::LfoVA:        return "lfo_va_basic";
            case ModuleTypeId::MasterDelay:  return "fx_delay_modern";
            case ModuleTypeId::ChorusPool:   return "fx_chorus_juno";
            case ModuleTypeId::SpaceEcho:    return "fx_space_echo_re201";
            case ModuleTypeId::MidiIn:       return "midi_in";
            case ModuleTypeId::TestParity:   return "test_parity_v7";
            default: return "unknown";
        }
    }

    /**
     * @brief Convierte un identificador de catálogo (string) a su ID numérico de la Era 7.
     */
    inline ModuleTypeId mapIdToType(const std::string& id) {
        if (id == "osc_juno_dco")      return ModuleTypeId::JunoDCO;
        if (id == "osc_jp_8000")       return ModuleTypeId::JpOscillator;
        if (id == "osc_korg_ms20")     return ModuleTypeId::KorgVCO;
        if (id == "osc_va_basic" || id == "oscillator_vA") return ModuleTypeId::VaOscillator;
        if (id == "flt_juno_ir3109" || id == "filter_vA") return ModuleTypeId::JunoFilter;
        if (id == "flt_jp_8000")       return ModuleTypeId::JpFilter;
        if (id == "flt_korg_35")       return ModuleTypeId::KorgFilter;
        if (id == "env_adsr_va" || id == "envelope_adsr")  return ModuleTypeId::EnvelopeAdsr;
        if (id == "lfo_va_basic" || id == "lfo")           return ModuleTypeId::LfoVA;
        if (id == "fx_delay_modern" || id == "vca")        return ModuleTypeId::MasterDelay;
        if (id == "fx_chorus_juno")    return ModuleTypeId::ChorusPool;
        if (id == "fx_space_echo_re201") return ModuleTypeId::SpaceEcho;
        if (id == "midi_in")           return ModuleTypeId::MidiIn;
        if (id == "midi_trigger")      return ModuleTypeId::MidiIn;
        if (id == "omega_lab_monitor") return ModuleTypeId::TestParity;
        if (id == "test_parity_v7" || id == "test_parity") return ModuleTypeId::TestParity;
        return ModuleTypeId::None;
    }

    /**
     * @brief Identificadores de Parámetros Genéricos.
     */
    enum class ParamId : uint16_t {
        None = 0,
        
        // Osciladores
        Frequency = 1,
        Detune = 2,
        PulseWidth = 3,
        PwmAmount = 4,
        SubLevel = 5,
        NoiseLevel = 6,
        SawOn = 7,
        PulseOn = 8,
        
        // Filtros
        Cutoff = 50,
        Resonance = 51,
        Drive = 52,
        KeyTrack = 53,
        EnvDepth = 54,
        LfoDepth = 55,
        
        // Envolventes / VCA
        Attack = 100,
        Decay = 101,
        Sustain = 102,
        Release = 103,
        Amplitude = 150,
        
        // FX / Global
        Mix = 200,
        Feedback = 201,
        Time = 202,
        Speed = 203,
        Intensity = 204
    };

    /**
     * @brief Tipos de conexión en el Patchbay.
     */
    enum class ConnectionType : uint8_t {
        Audio = 0,
        CV = 1,
        MIDI = 2,
        Modulation = 3
    };

} // namespace Model
} // namespace Core
} // namespace Omega
