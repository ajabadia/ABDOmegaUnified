/**
 * OMEGA Era 7 - Canonical Identifiers (TypeScript)
 * Mirrors PatchIdentifiers.h for full-stack binary compatibility.
 */
export declare enum ModuleTypeId {
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
    SpaceEcho = 102
}
export declare enum ParamId {
    None = 0,
    Frequency = 1,
    Detune = 2,
    PulseWidth = 3,
    PwmAmount = 4,
    SubLevel = 5,
    NoiseLevel = 6,
    SawOn = 7,
    PulseOn = 8,
    Cutoff = 50,
    Resonance = 51,
    Drive = 52,
    KeyTrack = 53,
    EnvDepth = 54,
    LfoDepth = 55,
    Attack = 100,
    Decay = 101,
    Sustain = 102,
    Release = 103,
    Mix = 200,
    Feedback = 201,
    Time = 202,
    Speed = 203,
    Intensity = 204
}
export declare enum ConnectionType {
    Audio = 0,
    CV = 1,
    MIDI = 2,
    Modulation = 3
}
//# sourceMappingURL=schema_ids.d.ts.map