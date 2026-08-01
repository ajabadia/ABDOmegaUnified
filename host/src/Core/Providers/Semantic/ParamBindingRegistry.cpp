#include "ParamBindingRegistry.h"

namespace Omega::Core::Service {

    ParamBindingRegistry& ParamBindingRegistry::getInstance() {
        static ParamBindingRegistry instance;
        return instance;
    }

    void ParamBindingRegistry::apply(const juce::String& paramId, float value, VoiceConfig& cfg) {
        if (mBindings.count(paramId)) {
            mBindings[paramId](cfg, value);
        }
    }

    void ParamBindingRegistry::applyGlobal(const juce::String& paramId, float value, EngineConfig& cfg) {
        if (mGlobalBindings.count(paramId)) {
            mGlobalBindings[paramId](cfg, value);
        }
    }

    ParamBindingRegistry::ParamBindingRegistry() {
        registerStandardBindings();
    }

    void ParamBindingRegistry::registerStandardBindings() {
        auto reg = [&](const juce::String& id, auto action) {
            mBindings[id] = [action](VoiceConfig& c, float v) { action(c, v); };
        };

        // --- Voice Components ---
        reg("layer.a.cutoff",           [](VoiceConfig& c, float v) { c.cutoff = v; });
        reg("layer.a.resonance",        [](VoiceConfig& c, float v) { c.resonance = v; });
        reg("layer.a.env.attack",       [](VoiceConfig& c, float v) { c.attack = v; });
        reg("layer.a.env.decay",        [](VoiceConfig& c, float v) { c.decay = v; });
        reg("layer.a.env.sustain",      [](VoiceConfig& c, float v) { c.sustain = v; });
        reg("layer.a.env.release",      [](VoiceConfig& c, float v) { c.release = v; });
        
        reg("layer.a.osc.saw.on",       [](VoiceConfig& c, float v) { c.sawOn = (v > 0.5f); });
        reg("layer.a.osc.pulse.on",     [](VoiceConfig& c, float v) { c.pulseOn = (v > 0.5f); });
        reg("layer.a.osc.sub.level",    [](VoiceConfig& c, float v) { c.subLevel = v; });
        reg("layer.a.osc.noise.level",  [](VoiceConfig& c, float v) { c.noiseLevel = v; });
        reg("layer.a.osc.pwm.amount",   [](VoiceConfig& c, float v) { c.pwmAmount = v; });
        reg("layer.a.osc.pwm.mode",     [](VoiceConfig& c, float v) { c.pwmModeLfo = (v > 0.5f); });
        
        reg("layer.a.vcf.env.depth",    [](VoiceConfig& c, float v) { c.vcfEnvDepth = v; });
        reg("layer.a.vcf.lfo.depth",    [](VoiceConfig& c, float v) { c.vcfLfoDepth = v; });
        reg("layer.a.vcf.keytrack",     [](VoiceConfig& c, float v) { c.vcfKeyTracking = v; });
        reg("layer.a.vcf.env.inv",      [](VoiceConfig& c, float v) { c.vcfEnvInverted = (v > 0.5f); });
        reg("layer.a.dco.lfo.depth",    [](VoiceConfig& c, float v) { c.dcoLfoDepth = v; });
        reg("layer.a.hpf.pos",          [](VoiceConfig& c, float v) { c.hpfPosition = (int)v; });
        reg("layer.a.vca.mode",         [](VoiceConfig& c, float v) { c.vcaGateMode = (v > 0.5f); });
        reg("layer.a.vca.gain",         [](VoiceConfig& c, float v) { c.vcaGain = v; });
        
        reg("layer.a.lfo.rate",         [](VoiceConfig& c, float v) { c.lfoRate = v; });
        reg("layer.a.lfo.wave",         [](VoiceConfig& c, float v) { c.lfoWave = (int)v; });
        reg("layer.a.korg.hpf.cutoff",  [](VoiceConfig& c, float v) { c.korgHpCutoff = v; });
        reg("layer.a.korg.hpf.res",     [](VoiceConfig& c, float v) { c.korgHpRes = v; });
        reg("layer.a.korg.grit",        [](VoiceConfig& c, float v) { c.korgGrit = v; });

        reg("layer.a.jp.detune",        [](VoiceConfig& c, float v) { c.jpDetune = v; });
        reg("layer.a.jp.spread",        [](VoiceConfig& c, float v) { c.jpSpread = v; });
        reg("layer.a.jp.filter.mode",   [](VoiceConfig& c, float v) { c.jpFilterMode = (int)v; });

        // --- Global Components ---
        auto regGlobal = [&](const juce::String& id, auto action) {
            mGlobalBindings[id] = [action](EngineConfig& c, float v) { action(c, v); };
        };

        regGlobal("global.chorus.mode",         [](EngineConfig& c, float v) { c.chorusMode = (int)v; });
        regGlobal("global.chorus.mix",          [](EngineConfig& c, float v) { c.chorusMix = v; });
        regGlobal("layer.a.fx.space.enable",    [](EngineConfig& c, float v) { c.spaceEchoEnabled = (v > 0.5f); });
        regGlobal("layer.a.fx.space.speed",     [](EngineConfig& c, float v) { c.spaceEchoSpeed = v; });
        regGlobal("layer.a.fx.space.intensity", [](EngineConfig& c, float v) { c.spaceEchoIntensity = v; });
        regGlobal("layer.a.fx.space.echo.vol",  [](EngineConfig& c, float v) { c.spaceEchoEchoVol = v; });
        regGlobal("layer.a.fx.space.rev.vol",   [](EngineConfig& c, float v) { c.spaceEchoReverbVol = v; });
        regGlobal("layer.a.fx.space.mode",      [](EngineConfig& c, float v) { c.spaceEchoMode = (int)v; });
        
        regGlobal("midi_channel", [](EngineConfig& c, float v) { c.globalMidiChannel = (int)v; });
        regGlobal("transpose",    [](EngineConfig& c, float v) { c.globalTranspose = (int)v; });
    }

} // namespace Omega::Core::Service
