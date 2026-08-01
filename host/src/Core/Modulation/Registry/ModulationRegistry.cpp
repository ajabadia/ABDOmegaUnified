#include "ModulationRegistry.h"
#include "../../Voice/Plan/CompiledVoicePlan.h"

namespace Omega::Core::Modulation {

    TargetStableId ModulationRegistry::getStableId(const std::string& targetId) {
        if (targetId.find("pitch") != std::string::npos) return TargetStableId::Pitch;
        if (targetId.find("gate") != std::string::npos) return TargetStableId::Gate;
        if (targetId.find("gain") != std::string::npos) return TargetStableId::VcaGain;
        if (targetId.find("cutoff") != std::string::npos) return TargetStableId::Cutoff;
        if (targetId.find("resonance") != std::string::npos) return TargetStableId::Resonance;
        if (targetId.find("attack") != std::string::npos) return TargetStableId::EnvAttack;
        if (targetId.find("decay") != std::string::npos) return TargetStableId::EnvDecay;
        if (targetId.find("sustain") != std::string::npos) return TargetStableId::EnvSustain;
        if (targetId.find("release") != std::string::npos) return TargetStableId::EnvRelease;
        
        return TargetStableId::Custom; 
    }

    uint8_t ModulationRegistry::getSignalIndex(const std::string& sourceId) {
        using namespace Omega::Core::Voice;
        
        if (sourceId.find("pitch") != std::string::npos) return CompiledSignalSpace::kMidiToCvPitch;
        if (sourceId.find("gate") != std::string::npos)  return CompiledSignalSpace::kMidiToCvGate;
        if (sourceId.find("vel") != std::string::npos)   return CompiledSignalSpace::kMidiToCvVelocity;
        if (sourceId.find("midi") != std::string::npos)  return CompiledSignalSpace::kMidiLink;
        
        if (sourceId == "lfo.1") return CompiledSignalSpace::lfo(0);
        if (sourceId == "env.1") return CompiledSignalSpace::adsr(0);
        
        return CompiledSignalSpace::kInvalid;
    }

    std::vector<SourceDescriptor> ModulationRegistry::getStaticSources() {
        return {
            {"midi.vel", "VELOCITY", SourceCategory::MIDI, NodeType::MIDIInput, -1},
            {"midi.mw",  "MOD WHEEL", SourceCategory::MIDI, NodeType::MIDIInput, -1}
        };
    }

    bool ModulationRegistry::isValidSource(const std::string& id) { return !id.empty(); }
    bool ModulationRegistry::isValidTarget(const std::string& id) { return !id.empty(); }

} // namespace Omega::Core::Modulation
