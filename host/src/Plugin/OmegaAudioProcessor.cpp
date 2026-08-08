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
#include "WasmModuleService.h"

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
          mPatchRepository (),
          mUiBridge (this, mCatalog, mApvts, mSystemSettings)
    {
        mUiBridge.setOnLoadCallback([this]() { /* [Era 7] Patch refresh handled via Bridge/Config */ });

        for (int i = 0; i < 128; ++i) mNoteToVoice[i] = -1;
        for (int i = 0; i < Core::Service::SystemSettingsManager::kMaxVoices; ++i) mVoiceLastUsed[i] = 0;

        // [Era 7.2] Synchronize dynamic parameters with the Registry
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        for (const auto& [id, desc] : registry.getAllParameters()) {
            mParamPointers.push_back(mApvts.getRawParameterValue(id));
        }

        // [P1-4] Cache de la cola de release. Arranca en el PEOR caso (máximo
        // del registro + margen) — antes de que el primer tick del timer ajuste
        // el valor real, un host que consulte getTailLengthSeconds() durante la
        // carga debe recibir una cola suficiente (nunca 0.1 s).
        if (const auto* releaseDesc = registry.getParameter("layer.a.env.release")) {
            mReleaseParam = mApvts.getRawParameterValue("layer.a.env.release");
            mTailLengthSeconds.store(computeTailLengthSeconds(releaseDesc->maxValue));
        }

        startTimer(30); 
    }

    OmegaAudioProcessor::~OmegaAudioProcessor() {
        stopTimer();
        // [P0-3] Autosave de sesión best-effort al cerrar: la próxima vez que el
        // host arranque, prepareToPlay restaura el último estado.
        saveCurrentPatch();
    }

    void OmegaAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) {
        juce::ScopedNoDenormals noDenormals;

        for (const auto& msg : midiMessages) {
            const auto m = msg.getMessage();
            if (m.isNoteOn()) {
                dispatchSystemMidi(0x90, (uint8_t)m.getNoteNumber(), (uint8_t)m.getVelocity());
            } else if (m.isNoteOff()) {
                dispatchSystemMidi(0x80, (uint8_t)m.getNoteNumber(), 0);
            } else if (m.isController()) {
                // [P0-2] Modular puro: los CC viajan como eventos MIDI por el rack
                // (midi_in → cables → módulos), NO se mapean a parámetros globales.
                dispatchSystemMidi(0xB0, (uint8_t)m.getControllerNumber(), (uint8_t)m.getControllerValue());
            } else if (m.isAllNotesOff() || m.isAllSoundOff()) {
                // [P0-1] Fix bug de corrupción: mVoiceLastUsed[v] es un timestamp
                // (contador mAllocTime creciente), NO un número de nota — usarlo
                // como índice de mNoteToVoice[128] era un out-of-bounds de
                // escritura (mAllocTime > 127 → corrupción de memoria). El loop
                // completo de limpieza ya cubre el reset de notas.
                for (int v = 0; v < Core::Service::SystemSettingsManager::kMaxVoices; ++v) {
                    mEngine.noteOff(v);
                }
                for (int i = 0; i < 128; ++i) mNoteToVoice[i] = -1;
            }
        }

        mEngine.renderNextBlock(buffer);
    }

    void OmegaAudioProcessor::processBlockBypassed(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) {
        buffer.clear();
        for (int v = 0; v < Core::Service::SystemSettingsManager::kMaxVoices; ++v) {
            mEngine.noteOff(v);
        }
        for (int i = 0; i < 128; ++i) mNoteToVoice[i] = -1;
    }

    bool OmegaAudioProcessor::planHasMidiIn() const noexcept {
        const auto* snapshot = mEngineConfig.getCurrentSnapshot();
        if (!snapshot || !snapshot->isValid) return false;
        for (int i = 0; i < snapshot->voicePlan.unitCount; ++i) {
            if (snapshot->voicePlan.units[i].moduleId == "midi_in") return true;
        }
        return false;
    }

    void OmegaAudioProcessor::dispatchSystemMidi(uint8_t status, uint8_t d1, uint8_t d2) {
        // [P0-2] Modular puro: sin módulo midi_in en el rack, el MIDI del sistema
        // no entra (el usuario decide conectar la entrada).
        //
        // NOTA (desync de paths): mNoteToVoice/mVoiceLastUsed solo los mantiene
        // ESTE path (sistema → midi_in). Los módulos que publican notas por su
        // cuenta (p. ej. midi_trigger vía omega_publish_midi) activan voces por
        // onModuleMidi SIN tocar mNoteToVoice — son dos allocators coexistentes.
        // En la práctica son paths complementarios (el rack está cableado por el
        // usuario); documentado en PLUGIN_IMPROVEMENT_PLAN.md (P0-2, nota del
        // revisor). NO unificar sin decidir el allocator único.
        if (!planHasMidiIn()) return;

        const uint8_t type = status & 0xF0;
        const int note = (type == 0x90 || type == 0x80) ? (int)d1 : -1;

        int voice = 0;
        if (note >= 0) {
            if (type == 0x90 && d2 > 0) {
                // NoteOn: asignar voz LRU (misma política que triggerNote).
                voice = mNoteToVoice[note];
                if (voice < 0) {
                    const int numVoices = mSystemSettings.getNumVoices();
                    voice = 0;
                    int lruTime = mVoiceLastUsed[0];
                    for (int i = 1; i < numVoices; ++i) {
                        if (mVoiceLastUsed[i] < lruTime) {
                            lruTime = mVoiceLastUsed[i];
                            voice = i;
                        }
                    }
                    for (int n = 0; n < 128; ++n) {
                        if (mNoteToVoice[n] == voice) mNoteToVoice[n] = -1;
                    }
                }
                mNoteToVoice[note] = voice;
                mVoiceLastUsed[voice] = ++mAllocTime;
            } else {
                // NoteOff: la voz que tenía la nota.
                voice = mNoteToVoice[note];
                if (voice < 0) return; // No estaba sonando
                mNoteToVoice[note] = -1;
            }
        }

        // Despachar al módulo midi_in de la voz (el módulo reenvía por su puerto
        // y omega_publish_midi activa la voz vía onModuleMidi).
        Core::Wasm::WasmModuleService::getInstance().dispatchMidi("midi_in", voice, status, d1, d2);
    }

    void OmegaAudioProcessor::loadPatch(const Core::Model::PatchDocument& patch) {
        mEngineConfig.applyPatch(patch);
        mUiBridge.forceRepaint();
    }

    void OmegaAudioProcessor::saveCurrentPatch() {
        // [P0-3] Autosave de sesión: current.patch.json (VarSerialization,
        // round-trip completo del PatchDocument incl. patchbayMatrix). Restaurado
        // en prepareToPlay si existe; también expuesto como comando RPC
        // "saveCurrentPatch" (RpcPresetController).
        mPatchRepository.saveCurrent(mEngineConfig.getPatchDocument());
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
                // [P0-1] LRU limitado al nº de voces activas del setting
                // (getNumVoices() clampea a kMaxVoices). Antes: literal 16 suelto.
                // Edge case intencional: si se baja la polifonía con notas sonando
                // en voces superiores, esas notas siguen hasta su NoteOff (el LRU
                // solo asigna dentro de 0..numVoices-1). No "corregir" sin decidir
                // el comportamiento de corte.
                const int numVoices = mSystemSettings.getNumVoices();
                int lruVoice = 0;
                int lruTime = mVoiceLastUsed[0];
                for (int i = 1; i < numVoices; ++i) {
                    if (mVoiceLastUsed[i] < lruTime) {
                        lruTime = mVoiceLastUsed[i];
                        lruVoice = i;
                    }
                }
                voice = lruVoice;
                // [P0-1] Fix bug de stealing: mNoteToVoice es nota→voz
                // (índice = nota, valor = voz). Antes se indexaba por voz
                // (mNoteToVoice[voice] >= 0) limpiando la entrada equivocada.
                // Ahora se localiza la nota que ocupa la voz robada.
                for (int n = 0; n < 128; ++n) {
                    if (mNoteToVoice[n] == lruVoice) mNoteToVoice[n] = -1;
                }
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

                // [P0-3] Restaurar la sesión previa (current.patch.json) si
                // existe; si no, aplicar el patch por defecto (P0-2: con el
                // módulo midi_in como puente de entrada del rack). Fuente única:
                // Core::Model::createDefaultPatch (misma que handleNewPreset).
                // Nota del revisor: si el autosave existe pero el documento está
                // vacío (p. ej. plugin instanciado en un DAW sin prepareToPlay
                // y cerrado sin rack), cargarlo mataría el puente MIDI — el
                // guard de modules.empty() cae al patch por defecto.
                Core::Model::PatchDocument bootDoc;
                if (!mPatchRepository.loadCurrent(bootDoc) || bootDoc.modules.empty()) {
                    bootDoc = Core::Model::createDefaultPatch();
                }
                mEngineConfig.applyPatch(bootDoc);
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
    double OmegaAudioProcessor::getTailLengthSeconds() const {
        // [P1-4] Cola cacheada por el timer (release real + margen). Antes:
        // 0.1 s fijo → clics al parar el transporte con releases largos (el
        // registro permite hasta 10 s). La lectura es atómica (segura desde el
        // hilo de audio, escritura desde el timer).
        return mTailLengthSeconds.load();
    }
    int OmegaAudioProcessor::getNumPrograms() { return 1; }
    int OmegaAudioProcessor::getCurrentProgram() { return 0; }
    void OmegaAudioProcessor::setCurrentProgram(int) {}
    const juce::String OmegaAudioProcessor::getProgramName(int) { return ""; }
    void OmegaAudioProcessor::changeProgramName(int, const juce::String&) {}
    
    void OmegaAudioProcessor::timerCallback() { updateParameters(); }
    void OmegaAudioProcessor::updateParameters() noexcept {
        // [P1-1] Modo lote: el timer pregunta por TODOS los parámetros cada 30 ms.
        // Dentro del lote, updateParameter muta el documento y solo marca dirty;
        // endBatch recompila el snapshot UNA vez si hubo algún cambio real (y
        // además cada updateParameter salta si el valor es idéntico). Antes:
        // N recompilaciones por tick aunque nada hubiera cambiado.
        mEngineConfig.beginBatch();

        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        auto allParams = registry.getAllParameters();
        
        int idx = 0;
        for (const auto& [id, desc] : allParams) {
            if (idx < mParamPointers.size() && mParamPointers[idx]) {
                float val = mParamPointers[idx]->load();
                // [Era 8.1] Ruta por ID semántico. El descriptor (id string, ej.
                // "layer.a.cutoff") se resuelve en EngineConfigManager contra el
                // PatchDocument (módulo + slot del catálogo). Antes:
                // updateParameter(0, (ParamId)idx, val) — idx era el índice del
                // map (orden alfabético, no un ParamId) e instanceId=0 no
                // resolvía ningún módulo → no-op silencioso.
                mEngineConfig.updateParameter(juce::String(id), val);
            }
            idx++;
        }

        mEngineConfig.endBatch();

        // [P1-4] Refrescar la cola de release con el valor REAL del APVTS
        // (normalizado 0-1 → rango físico del registro en ms → segundos + margen).
        // El host consulta getTailLengthSeconds() para el offlining al parar el
        // transporte; sin esta actualización declararía la cola del arranque
        // (peor caso) o el 0.1 s legacy → clics con releases largos.
        if (mReleaseParam) {
            if (const auto* releaseDesc = registry.getParameter("layer.a.env.release")) {
                const float releaseMs = denormalizeParam(mReleaseParam->load(),
                                                         releaseDesc->minValue,
                                                         releaseDesc->maxValue);
                mTailLengthSeconds.store(computeTailLengthSeconds(releaseMs));
            }
        }
    }

} // namespace Plugin
} // namespace Omega

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new Omega::Plugin::OmegaAudioProcessor();
}
