#pragma once

#include <juce_core/juce_core.h>

namespace Omega::Core {

    /**
     * @brief Centralized semantic identifiers for the OMEGA platform.
     * Implementing as a struct of static members for class-scope aliasing.
     */
    struct Identifiers {

        // --- System / Global ---
        static inline const juce::Identifier OMEGAPRESET {"OMEGAPRESET"};
        static inline const juce::Identifier id         {"id"};
        static inline const juce::Identifier name       {"name"};
        static inline const juce::Identifier author     {"author"};
        static inline const juce::Identifier engine     {"engine"};
        static inline const juce::Identifier masterGainDb {"masterGainDb"};
        static inline const juce::Identifier layers     {"layers"};
        static inline const juce::Identifier LAYER      {"LAYER"};
        static inline const juce::Identifier params     {"params"};
        static inline const juce::Identifier voiceArch  {"voiceArch"};
        static inline const juce::Identifier COMPONENT  {"COMPONENT"};
        static inline const juce::Identifier slotName   {"slotName"};
        static inline const juce::Identifier componentId {"componentId"};
        static inline const juce::Identifier instanceId {"instanceId"};
        static inline const juce::Identifier slotType   {"slotType"};
        
        // --- Architecture Categories ---
        static inline const juce::Identifier oscillators {"oscillators"};
        static inline const juce::Identifier filters     {"filters"};
        static inline const juce::Identifier amplifiers  {"amplifiers"};
        static inline const juce::Identifier envelopes   {"envelopes"};
        static inline const juce::Identifier lfos        {"lfos"};
        static inline const juce::Identifier modulators  {"modulators"};
        static inline const juce::Identifier fxSlots     {"fxSlots"};
        static inline const juce::Identifier auxiliary   {"auxiliary"};
        
        // --- Voice Architecture 2.0 ---
        static inline const juce::Identifier voiceChain   {"voiceChain"};
        static inline const juce::Identifier NODES        {"NODES"};
        static inline const juce::Identifier CONNECTIONS  {"CONNECTIONS"};
        static inline const juce::Identifier NODE         {"NODE"};
        static inline const juce::Identifier CONNECTION   {"CONNECTION"};
        static inline const juce::Identifier nodeId       {"nodeId"};
        static inline const juce::Identifier role         {"role"};
        static inline const juce::Identifier from         {"from"};
        static inline const juce::Identifier to           {"to"};
        static inline const juce::Identifier bus          {"bus"};

        // --- Parameter IDs (Unified Contract) ---
        static inline const juce::Identifier cutoff           {"cutoff"};
        static inline const juce::Identifier resonance        {"resonance"};
        static inline const juce::Identifier levelDb          {"levelDb"};
        static inline const juce::Identifier pan              {"pan"};
        static inline const juce::Identifier hpfPosition      {"hpfPosition"};
        static inline const juce::Identifier vcaGateMode      {"vcaGateMode"};
        static inline const juce::Identifier analogDrift      {"analogDrift"};
        static inline const juce::Identifier sawOn            {"sawOn"};
        static inline const juce::Identifier pulseOn          {"pulseOn"};
        static inline const juce::Identifier subLevel         {"subLevel"};
        static inline const juce::Identifier noiseLevel       {"noiseLevel"};
        static inline const juce::Identifier pwmMode          {"pwmMode"};
        static inline const juce::Identifier pwmAmount        {"pwmAmount"};
        static inline const juce::Identifier vcfEnvDepth      {"vcfEnvDepth"};
        static inline const juce::Identifier vcfModDepth      {"vcfModDepth"};
        static inline const juce::Identifier vcfKeyTracking   {"vcfKeyTracking"};
        static inline const juce::Identifier vcfEnvInverted   {"vcfEnvInverted"};
        static inline const juce::Identifier dcoLfoDepth      {"dcoLfoDepth"};
        static inline const juce::Identifier attack           {"attack"};
        static inline const juce::Identifier decay            {"decay"};
        static inline const juce::Identifier sustain          {"sustain"};
        static inline const juce::Identifier release          {"release"};
        
        static inline const juce::Identifier lfoRate          {"lfoRate"};
        static inline const juce::Identifier lfoWave          {"lfoWave"};
        static inline const juce::Identifier jpDetune         {"jpDetune"};
        static inline const juce::Identifier jpSpread         {"jpSpread"};

        // Korg Specific
        static inline const juce::Identifier korgHpCutoff     {"korgHpCutoff"};
        static inline const juce::Identifier korgHpResonance  {"korgHpResonance"};
        static inline const juce::Identifier korgGrit         {"korgGrit"};

        // --- UI / Visual ---
        static inline const juce::Identifier VISUAL           {"VISUAL"};
        static inline const juce::Identifier scope            {"scope"};
        static inline const juce::Identifier followsPreset    {"followsPreset"};
        static inline const juce::Identifier mode             {"mode"};
        static inline const juce::Identifier currentContext   {"currentContext"};
        static inline const juce::Identifier freeze           {"freeze"};
        static inline const juce::Identifier audio            {"audio"};
        static inline const juce::Identifier mod              {"mod"};
        static inline const juce::Identifier viewMode         {"viewMode"};
        static inline const juce::Identifier sourceA          {"sourceA"};
        static inline const juce::Identifier sourceB          {"sourceB"};
        static inline const juce::Identifier timebase         {"timebase"};
        static inline const juce::Identifier scale            {"scale"};
        static inline const juce::Identifier trigger          {"trigger"};

        // --- Patchbay-Matrix (Hyper-ACE) ---
        static inline const juce::Identifier patchbayMatrix    {"patchbayMatrix"};
        static inline const juce::Identifier slot             {"slot"};
        static inline const juce::Identifier source           {"source"};
        static inline const juce::Identifier target           {"target"};
        static inline const juce::Identifier amount           {"amount"};
        static inline const juce::Identifier via              {"via"};
        static inline const juce::Identifier viaAmount        {"viaAmount"};
        static inline const juce::Identifier active           {"active"};
        static inline const juce::Identifier gate             {"gate"};
        static inline const juce::Identifier pitch            {"pitch"};
        static inline const juce::Identifier sync             {"sync"};
        static inline const juce::Identifier midi_in          {"midi_in"};
    };

} // namespace Omega::Core
