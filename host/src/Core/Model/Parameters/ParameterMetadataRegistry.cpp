#include "ParameterMetadataRegistry.h"
#include "../Identifiers/OmegaIdentifiers.h"

namespace Omega::Core {

    ParameterMetadataRegistry::ParameterMetadataRegistry() {
        // [Fix] Self-initialize with Era 7 defaults. Without this, the
        // production registry stays empty (only the tests called
        // initializeDefaults()), yielding an EMPTY parameter layout in the
        // plugin (zero automation parameters) and no MIDI CC mappings.
        initializeDefaults();
    }

    ParameterMetadataRegistry& ParameterMetadataRegistry::getInstance() {
        static ParameterMetadataRegistry instance;
        return instance;
    }

    void ParameterMetadataRegistry::registerParameter(const ParameterDescriptor& desc) {
        mParameters[desc.id] = desc;
        if (desc.ccNumber >= 0) {
            mMidiMap[desc.ccNumber] = desc.id;
        }
    }

    const ParameterDescriptor* ParameterMetadataRegistry::getParameter(const std::string& id) const {
        auto it = mParameters.find(id);
        return (it != mParameters.end()) ? &it->second : nullptr;
    }

    const std::map<std::string, ParameterDescriptor>& ParameterMetadataRegistry::getAllParameters() const {
        return mParameters;
    }

    std::string ParameterMetadataRegistry::getParamIdFromCC(int cc) const {
        auto it = mMidiMap.find(cc);
        return (it != mMidiMap.end()) ? it->second : "";
    }

    ModSource ParameterMetadataRegistry::getModSourceFromCC(int cc) const {
        auto id = getParamIdFromCC(cc);
        if (id.empty()) return ModSource::Count;
        
        auto it = mParameters.find(id);
        return (it != mParameters.end()) ? it->second.modSource : ModSource::Count;
    }

    void ParameterMetadataRegistry::initializeDefaults() {
        using IDs = Identifiers;

        // --- JUNO FAMILY / CORE ---
        registerParameter({"layer.a.cutoff", "Cutoff", "Main low-pass filter cutoff", ParamValueType::Continuous, 20.0f, 20000.0f, 2000.0f, 0.0f, 0.3f, "Hz", "VCF", "synthesis", "knob", false, 74, ModSource::PE1, 8, IDs::cutoff});
        registerParameter({"layer.a.resonance", "Resonance", "Filter resonance / Q", ParamValueType::Continuous, 0.0f, 1.0f, 0.1f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, 71, ModSource::PE2, 7, IDs::resonance});
        
        ParameterOption off = {0, "Off"}, i = {1, "I"}, ii = {2, "II"}, iii = {3, "I+II"};
        ParameterDescriptor chorusMode = {"global.chorus.mode", "Chorus Mode", "Juno-style chorus selection", ParamValueType::Enum, 0.0f, 3.0f, 1.0f, 1.0f, 1.0f, "Choice", "FX", "synthesis", "select", false, 93, ModSource::Count, -1, IDs::mode};
        chorusMode.options = {off, i, ii, iii};
        registerParameter(chorusMode);

        registerParameter({"global.chorus.mix", "Chorus Mix", "Juno chorus wet/dry level", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::levelDb});

        ParameterDescriptor hpfPos = {"layer.a.hpf.pos", "HPF Position", "High-pass filter mode", ParamValueType::Enum, 0.0f, 3.0f, 1.0f, 1.0f, 1.0f, "Choice", "VCF", "synthesis", "switch", false, 81, ModSource::Count, -1, IDs::hpfPosition};
        hpfPos.options = {{0, "Off"}, {1, "1"}, {2, "2"}, {3, "3"}};
        registerParameter(hpfPos);

        ParameterDescriptor vcaMode = {"layer.a.vca.mode", "VCA Mode", "VCA Gate or Envelope mode", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "VCA", "synthesis", "switch", false, -1, ModSource::Count, -1, IDs::vcaGateMode};
        vcaMode.options = {{0, "Gate"}, {1, "Env"}};
        registerParameter(vcaMode);

        registerParameter({"layer.a.drift", "Analog Drift", "Simulated oscillator pitch instability", ParamValueType::Continuous, 0.0f, 1.0f, 0.1f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::analogDrift});
        registerParameter({"layer.a.osc.saw.on", "Saw On", "Toggle Sawtooth waveform", ParamValueType::Boolean, 0.0f, 1.0f, 1.0f, 1.0f, 1.0f, "Bool", "DCO", "synthesis", "switch", false, -1, ModSource::Count, -1, IDs::sawOn});
        registerParameter({"layer.a.osc.pulse.on", "Pulse On", "Toggle Pulse/Square waveform", ParamValueType::Boolean, 0.0f, 1.0f, 1.0f, 1.0f, 1.0f, "Bool", "DCO", "synthesis", "switch", false, -1, ModSource::Count, -1, IDs::pulseOn});
        registerParameter({"layer.a.osc.sub.level", "Sub Level", "Sub-oscillator volume", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::subLevel});
        registerParameter({"layer.a.osc.noise.level", "Noise Level", "White noise volume", ParamValueType::Continuous, 0.0f, 1.0f, 0.05f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::noiseLevel});
        
        ParameterDescriptor pwmMode = {"layer.a.osc.pwm.mode", "PWM Mode", "Pulse Width Modulation source", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "DCO", "synthesis", "switch", false, -1, ModSource::Count, -1, IDs::pwmMode};
        pwmMode.options = {{0, "Manual/LFO"}, {1, "Env"}};
        registerParameter(pwmMode);

        registerParameter({"layer.a.osc.pwm.amount", "PWM Amount", "Pulse width or PWM modulation depth", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::pwmAmount});
        registerParameter({"layer.a.vcf.env.depth", "VCF Env Depth", "Envelope modulation of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::vcfEnvDepth});
        registerParameter({"layer.a.vcf.lfo.depth", "VCF LFO Depth", "LFO modulation of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::vcfModDepth});
        registerParameter({"layer.a.vcf.keytrack", "VCF Keytrack", "Keyboard tracking of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::vcfKeyTracking});
        
        ParameterDescriptor vcfPol = {"layer.a.vcf.env.inv", "VCF Env Polarity", "Inverts the VCF envelope", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "VCF", "synthesis", "switch", false, -1, ModSource::Count, -1, IDs::vcfEnvInverted};
        vcfPol.options = {{0, "Normal"}, {1, "Inverted"}};
        registerParameter(vcfPol);
        
        registerParameter({"layer.a.dco.lfo.depth", "DCO LFO Depth", "LFO modulation of pitch (Vibrato)", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::dcoLfoDepth});
        registerParameter({"layer.a.lfo.rate", "LFO Rate", "LFO cycle speed", ParamValueType::Continuous, 0.01f, 20.0f, 1.0f, 0.0f, 0.3f, "Hz", "LFO", "synthesis", "knob", false, -1, ModSource::Count, -1, IDs::lfoRate});
        
        ParameterDescriptor lfoWave = {"layer.a.lfo.wave", "LFO Wave", "LFO waveform selection", ParamValueType::Enum, 0.0f, 5.0f, 0.0f, 1.0f, 1.0f, "Choice", "LFO", "synthesis", "select", false, -1, ModSource::Count, -1, IDs::lfoWave};
        lfoWave.options = {{0, "Sin"}, {1, "Tri"}, {2, "Saw"}, {3, "Sqr"}, {4, "Rnd"}, {5, "Noi"}};
        registerParameter(lfoWave);
        
        // --- ADSR ---
        registerParameter({"layer.a.env.attack", "Attack", "Envelope attack time", ParamValueType::Continuous, 0.1f, 10000.0f, 10.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 73, ModSource::Count, -1, IDs::attack});
        registerParameter({"layer.a.env.decay", "Decay", "Envelope decay time", ParamValueType::Continuous, 0.1f, 10000.0f, 100.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 75, ModSource::Count, -1, IDs::decay});
        registerParameter({"layer.a.env.sustain", "Sustain", "Envelope sustain level", ParamValueType::Continuous, 0.0f, 1.0f, 0.8f, 0.0f, 1.0f, "%", "ENV", "synthesis", "slider", false, 79, ModSource::Count, -1, IDs::sustain});
        registerParameter({"layer.a.env.release", "Release", "Envelope release time", ParamValueType::Continuous, 1.0f, 10000.0f, 500.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 72, ModSource::Count, -1, IDs::release});

        // --- MIDI SOURCES ---
        registerParameter({"midi.modwheel", "Mod Wheel", "Standard MIDI Modulation Wheel", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 1, ModSource::ModWheel});
        registerParameter({"midi.breath", "Breath", "MIDI Breath Controller", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 2, ModSource::Breath});
        registerParameter({"midi.expression", "Expression", "MIDI Expression Pedal", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 11, ModSource::Expression});
        registerParameter({"midi.sustain", "Sustain", "MIDI Sustain Pedal", ParamValueType::Boolean, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Bool", "MIDI", "midi", "switch", false, 64, ModSource::Sustain});
        registerParameter({"midi.ribbon", "Ribbon", "MIDI Ribbon Controller", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 16, ModSource::Ribbon});
    }

} // namespace Omega::Core
