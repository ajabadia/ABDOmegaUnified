#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include "OmegaAudioProcessor.h"
#include "OmegaMainEditor.h"
#include "OmegaIdentifiers.h"
#include "ParameterMetadataRegistry.h"
#include "SemanticBrokerService.h"
#include "ModulationTelemetryHub.h"
#include "ParamBindingRegistry.h"
#include "ISynthesisEngine.h"
#include "ParameterLayoutBuilder.h"

namespace Omega {
namespace Plugin {

    OmegaAudioProcessor::OmegaAudioProcessor()
        : juce::AudioProcessor (juce::AudioProcessor::BusesProperties().withInput  ("Input",  juce::AudioChannelSet::stereo(), false)
                                                                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          mCatalog (),
          mValidator (mCatalog),
          mSystemSettings (),
          mEngine (mSystemSettings),
          mApvts (*this, nullptr, "PARAMETERS", createParameterLayout()),
          mEngineConfig (mEngine, mCatalog),
          mUiBridge (this, mCatalog, mApvts, mSystemSettings)
    {
        mUiBridge.setOnLoadCallback([this]() { /* [Era 7] Patch refresh handled via Bridge/Config */ });

        for (int i = 0; i < 128; ++i) mNoteToVoice[i] = -1;
        for (int i = 0; i < 16; ++i) mVoiceLastUsed[i] = 0;

        // [Era 7.2] Synchronize dynamic parameters with the Registry
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        for (const auto& [id, desc] : registry.getAllParameters()) {
            mParamPointers.push_back(mApvts.getRawParameterValue(id));
        }

        startTimer(30); 
    }

    OmegaAudioProcessor::~OmegaAudioProcessor() {
        stopTimer();
    }

    void OmegaAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) {
        juce::ScopedNoDenormals noDenormals;

        for (const auto& msg : midiMessages) {
            const auto m = msg.getMessage();
            if (m.isNoteOn()) {
                triggerNote(m.getNoteNumber(), m.getVelocity(), true);
            } else if (m.isNoteOff()) {
                triggerNote(m.getNoteNumber(), 0, false);
            } else if (m.isAllNotesOff() || m.isAllSoundOff()) {
                for (int v = 0; v < 16; ++v) {
                    mEngine.noteOff(v);
                    mNoteToVoice[mVoiceLastUsed[v]] = -1;
                }
                for (int i = 0; i < 128; ++i) mNoteToVoice[i] = -1;
            }
        }

        mEngine.renderNextBlock(buffer);
    }

    void OmegaAudioProcessor::processBlockBypassed(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) {
        buffer.clear();
        for (int v = 0; v < 16; ++v) {
            mEngine.noteOff(v);
        }
        for (int i = 0; i < 128; ++i) mNoteToVoice[i] = -1;
    }

    void OmegaAudioProcessor::loadPatch(const Core::Model::PatchDocument& patch) {
        mEngineConfig.applyPatch(patch);
        mUiBridge.forceRepaint();
    }

    void OmegaAudioProcessor::saveCurrentPatch() {
        // [TODO] Serialize mEngineConfig.getPatchDocument() to disk.
    }

    juce::AudioProcessorValueTreeState::ParameterLayout OmegaAudioProcessor::createParameterLayout() {
        return ParameterLayoutBuilder::build();
    }

    juce::AudioProcessorEditor* OmegaAudioProcessor::createEditor() { return new UI::OmegaMainEditor (*this, mUiBridge); }
    bool OmegaAudioProcessor::hasEditor() const { return true; }
    const juce::String OmegaAudioProcessor::getName() const { return "ABD OMEGA 2.0"; }

    void OmegaAudioProcessor::triggerNote(int midiNote, int velocity, bool isOn) {
        if (isOn) {
            int voice = mNoteToVoice[midiNote];
            if (voice < 0) {
                int lruVoice = 0;
                int lruTime = mVoiceLastUsed[0];
                for (int i = 1; i < 16; ++i) {
                    if (mVoiceLastUsed[i] < lruTime) {
                        lruTime = mVoiceLastUsed[i];
                        lruVoice = i;
                    }
                }
                voice = lruVoice;
                if (mNoteToVoice[voice] >= 0) mNoteToVoice[voice] = -1;
            }
            mNoteToVoice[midiNote] = voice;
            mVoiceLastUsed[voice] = ++mAllocTime;
            float freq = 440.0f * std::pow(2.0f, (midiNote - 69.0f) / 12.0f);
            mEngine.noteOn(voice, freq);
        } else {
            int voice = mNoteToVoice[midiNote];
            if (voice >= 0) {
                mEngine.noteOff(voice);
                mNoteToVoice[midiNote] = -1;
            }
        }
    }

    void OmegaAudioProcessor::prepareToPlay(double sr, int sb) {
        mEngine.prepare(sr, sb);

        std::call_once(mCatalogOnceFlag, [this]() {
            juce::File exe = juce::File::getSpecialLocation(juce::File::currentExecutableFile);
            juce::File resourceDir = exe.getParentDirectory().getChildFile("Resources");

            int levelsSearched = 0;
            while (!resourceDir.exists() && levelsSearched < 15 && !exe.isRoot()) {
                exe = exe.getParentDirectory();
                resourceDir = exe.getChildFile("Resources");
                levelsSearched++;
            }

            if (resourceDir.exists()) {
                juce::File modulesDir = resourceDir.getChildFile("modules");
                mCatalog.loadFromModulesDirectory(modulesDir);

                juce::Array<juce::File> packs;
                modulesDir.findChildFiles(packs, juce::File::findFiles, false, "*.zip;*.acepack");
                for (const auto& pack : packs) {
                    mCatalog.loadFromAcePack(pack);
                }

                Core::Service::SemanticBrokerService::getInstance().setCatalog(&mCatalog);
            }
        });
    }
    void OmegaAudioProcessor::releaseResources() {}
    static void serializePatchDocument(const Core::Model::PatchDocument& doc, juce::MemoryOutputStream& stream) {
        auto writeStr = [&](const std::string& s) {
            uint32_t len = (uint32_t)s.size();
            stream.writeInt(len);
            stream.write(s.data(), len);
        };

        writeStr(doc.metadata.uuid);
        writeStr(doc.metadata.name);
        writeStr(doc.metadata.author);
        stream.writeInt64(doc.metadata.createdAt);
        stream.writeInt64(doc.metadata.modifiedAt);
        uint32_t numTags = (uint32_t)doc.metadata.tags.size();
        stream.writeInt(numTags);
        for (auto& t : doc.metadata.tags) writeStr(t);

        stream.writeFloat(doc.masterGainDb);
        stream.writeShort(doc.globalTranspose);
        stream.writeShort(doc.globalMidiChannel);

        auto writeParams = [&](const std::vector<Core::Model::ParamValue>& params) {
            uint32_t n = (uint32_t)params.size();
            stream.writeInt(n);
            for (auto& p : params) {
                stream.writeInt(static_cast<int>(p.id));
                stream.writeFloat(p.value);
                stream.writeInt(p.modulationBindingId);
            }
        };

        uint32_t numMods = (uint32_t)doc.modules.size();
        stream.writeInt(numMods);
        for (auto& m : doc.modules) {
            stream.writeInt(m.instanceId);
            stream.writeInt(static_cast<int>(m.typeId));
            stream.writeShort(m.position.rack);
            stream.writeShort(m.position.slot);
            stream.writeShort(m.position.order);
            writeParams(m.parameters);
            uint8_t flags = (m.flags.bypassed ? 1 : 0) | (m.flags.muted ? 2 : 0) | (m.flags.soloed ? 4 : 0);
            stream.writeByte(flags);
        }

        uint32_t numConns = (uint32_t)doc.connections.size();
        stream.writeInt(numConns);
        for (auto& c : doc.connections) {
            stream.writeInt(c.sourceModuleId);
            stream.writeShort(c.sourcePortId);
            stream.writeInt(c.targetModuleId);
            stream.writeShort(c.targetPortId);
            stream.writeShort((int16_t)c.type);
        }

        writeParams(doc.globalFxParams);
    }

    static Core::Model::PatchDocument deserializePatchDocument(juce::MemoryInputStream& stream) {
        Core::Model::PatchDocument doc;
        auto readStr = [&]() -> std::string {
            uint32_t len = stream.readInt();
            std::string s(len, '\0');
            if (len > 0) stream.read(&s[0], len);
            return s;
        };

        doc.metadata.uuid = readStr();
        doc.metadata.name = readStr();
        doc.metadata.author = readStr();
        doc.metadata.createdAt = stream.readInt64();
        doc.metadata.modifiedAt = stream.readInt64();
        uint32_t numTags = stream.readInt();
        doc.metadata.tags.resize(numTags);
        for (uint32_t i = 0; i < numTags; ++i) doc.metadata.tags[i] = readStr();

        doc.masterGainDb = stream.readFloat();
        doc.globalTranspose = stream.readShort();
        doc.globalMidiChannel = stream.readShort();

        auto readParams = [&]() -> std::vector<Core::Model::ParamValue> {
            uint32_t n = stream.readInt();
            std::vector<Core::Model::ParamValue> params(n);
            for (uint32_t i = 0; i < n; ++i) {
                params[i].id = static_cast<Core::Model::ParamId>(stream.readInt());
                params[i].value = stream.readFloat();
                params[i].modulationBindingId = stream.readInt();
            }
            return params;
        };

        uint32_t numMods = stream.readInt();
        doc.modules.resize(numMods);
        for (uint32_t i = 0; i < numMods; ++i) {
            auto& m = doc.modules[i];
            m.instanceId = stream.readInt();
            m.typeId = static_cast<Core::Model::ModuleTypeId>(stream.readInt());
            m.position.rack = stream.readShort();
            m.position.slot = stream.readShort();
            m.position.order = stream.readShort();
            m.parameters = readParams();
            uint8_t flags = stream.readByte();
            m.flags.bypassed = (flags & 1) != 0;
            m.flags.muted = (flags & 2) != 0;
            m.flags.soloed = (flags & 4) != 0;
        }

        uint32_t numConns = stream.readInt();
        doc.connections.resize(numConns);
        for (uint32_t i = 0; i < numConns; ++i) {
            auto& c = doc.connections[i];
            c.sourceModuleId = stream.readInt();
            c.sourcePortId = stream.readShort();
            c.targetModuleId = stream.readInt();
            c.targetPortId = stream.readShort();
            c.type = static_cast<Core::Model::ConnectionType>(stream.readShort());
        }

        doc.globalFxParams = readParams();
        return doc;
    }

    void OmegaAudioProcessor::getStateInformation(juce::MemoryBlock& destData) {
        juce::MemoryOutputStream stream(destData, false);

        stream.writeInt(0x4F4D4547); // magic 'OMEG'
        stream.writeInt(1);           // version

        auto apvtsXml = mApvts.state.createXml();
        juce::String apvtsString = apvtsXml ? apvtsXml->toString() : "";
        stream.writeInt((uint32_t)apvtsString.getNumBytesAsUTF8());
        stream.write(apvtsString.toRawUTF8(), apvtsString.getNumBytesAsUTF8());

        juce::MemoryOutputStream patchStream;
        serializePatchDocument(mEngineConfig.getPatchDocument(), patchStream);
        stream.writeInt((uint32_t)patchStream.getDataSize());
        stream.write(patchStream.getData(), patchStream.getDataSize());
    }

    void OmegaAudioProcessor::setStateInformation(const void* data, int sizeInBytes) {
        juce::MemoryInputStream stream(data, (size_t)sizeInBytes, false);

        uint32_t magic = stream.readInt();
        if (magic != 0x4F4D4547) return;
        uint32_t version = stream.readInt();
        if (version < 1) return;

        uint32_t apvtsSize = stream.readInt();
        if (apvtsSize > 0) {
            auto buf = std::make_unique<char[]>(apvtsSize + 1);
            stream.read(buf.get(), apvtsSize);
            buf[apvtsSize] = '\0';
            auto xml = juce::XmlDocument::parse(juce::String(buf.get()));
            if (xml) mApvts.state = juce::ValueTree::fromXml(*xml);
        }

        uint32_t patchSize = stream.readInt();
        if (patchSize > 0) {
            auto patchData = std::make_unique<uint8_t[]>(patchSize);
            stream.read(patchData.get(), patchSize);
            juce::MemoryInputStream patchStream(patchData.get(), patchSize, false);
            auto doc = deserializePatchDocument(patchStream);
            mEngineConfig.applyPatch(doc);
        }
    }
    bool OmegaAudioProcessor::acceptsMidi() const { return true; }
    bool OmegaAudioProcessor::producesMidi() const { return false; }
    double OmegaAudioProcessor::getTailLengthSeconds() const { return 0.1; }
    int OmegaAudioProcessor::getNumPrograms() { return 1; }
    int OmegaAudioProcessor::getCurrentProgram() { return 0; }
    void OmegaAudioProcessor::setCurrentProgram(int) {}
    const juce::String OmegaAudioProcessor::getProgramName(int) { return ""; }
    void OmegaAudioProcessor::changeProgramName(int, const juce::String&) {}
    
    void OmegaAudioProcessor::timerCallback() { updateParameters(); }
    void OmegaAudioProcessor::updateParameters() noexcept {
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        auto allParams = registry.getAllParameters();
        
        int idx = 0;
        for (const auto& [id, desc] : allParams) {
            if (idx < mParamPointers.size() && mParamPointers[idx]) {
                float val = mParamPointers[idx]->load();
                // [Era 7.2] Atomic update of the engine's runtime snapshot
                mEngineConfig.updateParameter(0, (Core::Model::ParamId)idx, val); 
            }
            idx++;
        }
    }

} // namespace Plugin
} // namespace Omega

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new Omega::Plugin::OmegaAudioProcessor();
}
