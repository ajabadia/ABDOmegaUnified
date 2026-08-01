#pragma once

#include "EngineConfigTypes.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief ConfiguraciÃ³n inmutable para una sola voz.
     */
    struct VoiceConfig {
        static constexpr int kMaxOscillatorsPerVoice = 4;
        OscillatorMode oscModes[kMaxOscillatorsPerVoice] = { OscillatorMode::JunoDco };
        int numActiveOscillators = 0; // If 0 and no Juno DCO, it's silent
        FilterType filterType { FilterType::JunoIR3109 };
        float cutoff { 2000.0f };
        float resonance { 0.2f };
        
        // ADSR
        float attack { 10.0f };
        float decay { 100.0f };
        float sustain { 0.5f };
        float release { 500.0f };

        // DCO
        bool sawOn { true };
        bool pulseOn { false };
        float subLevel { 0.0f };
        float noiseLevel { 0.0f };
        float pwmAmount { 0.5f };
        bool pwmModeLfo { false };

        // VCF Mod
        float vcfEnvDepth { 0.0f };
        float vcfLfoDepth { 0.0f };
        float vcfKeyTracking { 0.0f };
        bool vcfEnvInverted { false };

        // Korg/Prophecy Specific
        float korgHpCutoff { 20.0f };
        float korgHpRes { 0.1f };
        float korgGrit { 0.0f };

        // Others
        float lfoRate { 1.0f };
        int lfoWave { 0 };
        float dcoLfoDepth { 0.0f };
        int hpfPosition { 1 };
        bool vcaGateMode { false };
        float vcaGain { 0.8f };

        // Roland JP-8000/8080 Specific (Per-Voice)
        float jpDetune { 0.1f };
        float jpSpread { 0.1f };
        int jpFilterMode { 0 };
    };

    /**
     * @brief Snapshot de configuraciÃ³n completa para el motor.
     */
    struct EngineConfig {
        VoiceConfig voices[16];
        float masterGainDb { 0.0f };
        int globalMidiChannel { 0 }; // 0 = OMNI
        int globalTranspose { 0 };
        float chorusMix { 0.0f };
        bool chorusEnabled { false };
        int chorusMode { 1 };

        // Roland Space Echo RE-201
        bool spaceEchoEnabled { false };
        float spaceEchoSpeed { 0.5f };
        float spaceEchoIntensity { 0.5f };
        float spaceEchoEchoVol { 0.5f };
        float spaceEchoReverbVol { 0.3f };
        int spaceEchoMode { 1 };
        float spaceEchoWow { 0.1f };
        float spaceEchoDrive { 0.5f };

        // OMEGA Master Delay (Modern)
        bool delayEnabled { false };
        float delayTime { 0.5f };
        float delayFeedback { 0.3f };
        float delayMix { 0.0f };
    };

} // namespace Service
} // namespace Core
} // namespace Omega
