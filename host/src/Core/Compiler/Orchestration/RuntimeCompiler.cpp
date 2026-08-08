#include "RuntimeCompiler.h"
#include "GraphSorter.h"
#include "ModulationTelemetryRegistry.h"
#include "ParamIdRegistry.h"
#include <algorithm>
#include <cstdint>
#include <cstdlib>
#include <map>
#include <string>
#include <vector>

namespace Omega {
namespace Core {
namespace Compiler {

    using namespace ::Omega::Core::Model;
    using namespace ::Omega::Core::Voice;

    namespace {

        // ------------------------------------------------------------------
        // [P1-3] Hash determinista FNV-1a (32-bit) sin dependencias externas.
        // snapshotId identifica el PatchDocument fuente; planId identifica el
        // CompiledVoicePlan compilado. Cualquier cambio de contenido (módulos,
        // parámetros, conexiones, patchbay, FX globales) cambia el hash — el
        // snapshot se puede validar contra el documento sin comparación campo a
        // campo. Los campos individuales se hashean (no las structs), evitando
        // el padding del compilador.
        // ------------------------------------------------------------------
        uint32_t fnv1aBytes(const void* data, size_t len, uint32_t h) {
            const uint8_t* p = static_cast<const uint8_t*>(data);
            for (size_t i = 0; i < len; ++i) {
                h ^= p[i];
                h *= 16777619u;
            }
            return h;
        }

        template <typename T>
        uint32_t hashPOD(uint32_t h, const T& v) {
            return fnv1aBytes(&v, sizeof(T), h);
        }

        uint32_t hashString(uint32_t h, const std::string& s) {
            return fnv1aBytes(s.data(), s.size(), h);
        }

        uint32_t hashPatchDocument(const PatchDocument& doc) {
            uint32_t h = 2166136261u;
            h = hashPOD(h, doc.masterGainDb);
            h = hashPOD(h, doc.globalTranspose);
            h = hashPOD(h, doc.globalMidiChannel);
            for (const auto& m : doc.modules) {
                h = hashPOD(h, m.instanceId);
                h = hashPOD(h, m.typeId);
                h = hashPOD(h, m.position.rack);
                h = hashPOD(h, m.position.slot);
                h = hashPOD(h, m.position.order);
                h = hashPOD(h, m.flags.bypassed);
                h = hashPOD(h, m.flags.muted);
                h = hashPOD(h, m.flags.soloed);
                for (const auto& p : m.parameters) {
                    h = hashPOD(h, p.id);
                    h = hashPOD(h, p.value);
                    h = hashPOD(h, p.modulationBindingId);
                }
            }
            for (const auto& c : doc.connections) {
                h = hashPOD(h, c.sourceModuleId);
                h = hashPOD(h, c.sourcePortId);
                h = hashPOD(h, c.targetModuleId);
                h = hashPOD(h, c.targetPortId);
                h = hashPOD(h, c.type);
            }
            for (const auto& s : doc.patchbayMatrix) {
                h = hashString(h, s.source);
                h = hashString(h, s.target);
                h = hashPOD(h, s.amount);
                h = hashString(h, s.via);
                h = hashPOD(h, s.viaAmount);
                h = hashPOD(h, s.active);
                h = hashString(h, s.color);
            }
            for (const auto& p : doc.globalFxParams) {
                h = hashPOD(h, p.id);
                h = hashPOD(h, p.value);
                h = hashPOD(h, p.modulationBindingId);
            }
            return h;
        }

        uint32_t hashVoicePlan(const CompiledVoicePlan& plan) {
            uint32_t h = 2166136261u;
            h = hashPOD(h, plan.unitCount);
            for (int i = 0; i < plan.unitCount; ++i) {
                const auto& u = plan.units[i];
                h = hashPOD(h, u.nodeId);
                h = hashPOD(h, u.implementationId);
                h = hashString(h, u.moduleId);
                for (int k = 0; k < CompiledUnit::kMaxParams; ++k) {
                    h = hashPOD(h, u.stableParamIds[k]);
                    h = hashPOD(h, u.baseValues[k]);
                }
            }
            h = hashPOD(h, plan.connectionCount);
            for (int i = 0; i < plan.connectionCount; ++i) {
                const auto& c = plan.connections[i];
                h = hashPOD(h, c.fromUnit);
                h = hashPOD(h, c.toUnit);
                h = hashPOD(h, c.srcBus);
                h = hashPOD(h, c.dstBus);
                h = hashPOD(h, c.amount);
            }
            h = hashPOD(h, plan.midiTargetCount);
            for (int i = 0; i < plan.midiTargetCount; ++i) h = hashPOD(h, plan.midiTargets[i]);
            // Nota del revisor: executionOrder es parte del comportamiento runtime
            // del plan (lo calcula GraphSorter) — incluirlo para que un cambio de
            // orden para el mismo grafo se refleje en el planId.
            for (int i = 0; i < plan.unitCount; ++i) h = hashPOD(h, plan.executionOrder[i]);
            return h;
        }

        /**
         * [P1-3] Propaga el cutoff REAL del patch al VoiceConfig.
         * La ruta semántica "layer.a.cutoff" del registro apunta al módulo
         * JunoFilter con slot "cutoff" del catálogo. El valor del documento vive
         * en mod.parameters con ParamId local = slot+1 (contrato :44). Si el
         * módulo no fija el parámetro, se usa el defaultValue del catálogo; sin
         * módulo de filtro, el default de VoiceConfig (2000 Hz).
         */
        float resolveVoiceConfigCutoff(const PatchDocument& doc, const ::Omega::Core::Ace::AceCatalog& catalog) {
            for (const auto& mod : doc.modules) {
                // [P1-3] Ruta duplicada CONSCIENTEMENTE con EngineConfigManager::
                // semanticRoutes() ("layer.a.cutoff" → JunoFilter/"cutoff"). El
                // compiler es una función pura (no toca singletons como el
                // registro semántico), así que la ruta vive en dos sitios — si se
                // añade una ruta de cutoff a otro filtro (Korg/Jp), actualizar AMBOS.
                if (mod.typeId != ModuleTypeId::JunoFilter) continue;
                const auto* info = catalog.getComponent(mapTypeToId(mod.typeId));
                if (!info) continue;
                for (size_t slot = 0; slot < info->parameters.size(); ++slot) {
                    if (info->parameters[slot].id != "cutoff") continue;
                    const uint16_t localId = static_cast<uint16_t>(slot + 1);
                    for (const auto& p : mod.parameters) {
                        if (static_cast<uint16_t>(p.id) == localId) return p.value;
                    }
                    return info->parameters[slot].defaultValue;
                }
            }
            // Nota del revisor: sin módulo de filtro → default canónico del
            // VoiceConfig (EngineConfig.h), sin duplicar el literal 2000.0f.
            return ::Omega::Core::Service::VoiceConfig{}.cutoff;
        }

        /**
         * [P1-3] Amount REAL de una conexión audio desde el Patchbay Matrix.
         * PatchConnection solo lleva instancias + índices de puerto; el amount
         * vive en PatchbayMatrixSlot con IDs "instanceId.portId" (p. ej.
         * "1.out" → "2.cutoff"). Se correlaciona resolviendo los nombres de
         * puerto del catálogo. Sin slot activo → 1.0 (default histórico).
         *
         * NOTA DEL REVISOR (invariante asumida): sourcePortId/targetPortId se
         * tratan como índices en catalog.ports (nombres resueltos por catálogo).
         * Hoy doc.connections solo se puebla vía round-trip de VarSerialization
         * (los cables reales de la UI viven en patchbayMatrix con nombres), así
         * que si algún día un portId numérico NO es un índice de puerto, el match
         * simplemente no ocurre y el amount queda 1.0 (fallback seguro, sin
         * ruptura). Ver PatchConnection.h para el contrato documentado.
         */
        float resolveConnectionAmount(const PatchDocument& doc,
                                      const ::Omega::Core::Ace::AceCatalog& catalog,
                                      const PatchConnection& conn) {
            const ModuleInstance* srcMod = doc.findModule(conn.sourceModuleId);
            const ModuleInstance* dstMod = doc.findModule(conn.targetModuleId);
            if (!srcMod || !dstMod) return 1.0f;

            auto portName = [&](const ModuleInstance& mod, uint16_t portIdx) -> std::string {
                const auto* info = catalog.getComponent(mapTypeToId(mod.typeId));
                if (!info || portIdx >= info->ports.size()) return "";
                return info->ports[portIdx].id;
            };

            const std::string source = std::to_string(conn.sourceModuleId) + "." + portName(*srcMod, conn.sourcePortId);
            const std::string target = std::to_string(conn.targetModuleId) + "." + portName(*dstMod, conn.targetPortId);

            for (const auto& slot : doc.patchbayMatrix) {
                if (!slot.active) continue;
                if (slot.source == source && slot.target == target) return slot.amount;
            }
            return 1.0f;
        }

        /**
         * [P2-x] Derivación del grafo de audio desde el Patchbay Matrix (sync
         * bidireccional cables ↔ matrix, lado funcional).
         *
         * La matrix es la SOT del cableado: la UI la escribe (updatePatchbayMatrixSlot)
         * y los cables SVG la leen. Pero el grafo de audio del CompiledVoicePlan se
         * compila SOLO desde doc.connections — y la UI nunca escribe ese vector (los
         * cables reales viven en patchbayMatrix con IDs "instanceId.portId").
         * Resultado: connectionCount = 0 siempre en uso real → los cables del usuario
         * no enrutaban audio.
         *
         * Esta función cierra la brecha: los slots ACTIVOS cuyos DOS puertos son
         * audio (ModPortType::Audio por catálogo) se convierten en PatchConnection
         * de tipo Audio. Los cables CV/Gate/MIDI NO entran al grafo de audio (ruta
         * futura de modRoutes en CompiledVoicePlan). El amount del slot se correlaciona
         * después vía resolveConnectionAmount (ruta primaria, no fallback).
         *
         * NO persiste nada: el grafo se re-deriva en cada compile desde la matrix
         * (nunca hay estado duplicado que se desincronice).
         */
        std::vector<PatchConnection> deriveAudioConnections(const PatchDocument& doc,
                                                             const ::Omega::Core::Ace::AceCatalog& catalog) {
            std::vector<PatchConnection> derived;

            for (const auto& slot : doc.patchbayMatrix) {
                if (!slot.active) continue;

                auto parseId = [](const std::string& qualified,
                                  const ::Omega::Core::Ace::AceCatalog& cat,
                                  const PatchDocument& d,
                                  const ModuleInstance*& outMod,
                                  int& outPortIdx) {
                    const size_t dot = qualified.find('.');
                    if (dot == std::string::npos || dot == 0) return;
                    const std::string prefix = qualified.substr(0, dot);
                    if (prefix.empty()) return;
                    for (char c : prefix) {
                        if (c < '0' || c > '9') return; // ID legacy no numérico → no correlaciona
                    }
                    const uint32_t instanceId = static_cast<uint32_t>(std::strtoul(prefix.c_str(), nullptr, 10));
                    const std::string portName = qualified.substr(dot + 1);

                    const ModuleInstance* mod = d.findModule(instanceId);
                    if (!mod) return;
                    const auto* info = cat.getComponent(mapTypeToId(mod->typeId));
                    if (!info) return;
                    for (size_t i = 0; i < info->ports.size(); ++i) {
                        if (info->ports[i].id == portName) {
                            outMod = mod;
                            outPortIdx = static_cast<int>(i);
                            return;
                        }
                    }
                };

                const ModuleInstance* srcMod = nullptr;
                const ModuleInstance* dstMod = nullptr;
                int srcIdx = -1, dstIdx = -1;
                parseId(slot.source, catalog, doc, srcMod, srcIdx);
                parseId(slot.target, catalog, doc, dstMod, dstIdx);
                if (!srcMod || !dstMod || srcIdx < 0 || dstIdx < 0) continue;

                const auto* srcInfo = catalog.getComponent(mapTypeToId(srcMod->typeId));
                const auto* dstInfo = catalog.getComponent(mapTypeToId(dstMod->typeId));
                if (!srcInfo || !dstInfo) continue;
                // Solo cables audio→audio entran al grafo de audio (CV/Gate/MIDI
                // esperan a la ruta de modRoutes).
                if (srcInfo->ports[srcIdx].type != Modulation::ModPortType::Audio) continue;
                if (dstInfo->ports[dstIdx].type != Modulation::ModPortType::Audio) continue;

                // [Revisor P2-5] Dedup: dos slots activos con el MISMO par
                // audio→audio (matrix corrupta o preset) no deben enrutar la
                // señal DOS veces por el mismo bus. Solo el primer slot cuenta.
                const bool already = std::any_of(derived.begin(), derived.end(),
                    [&](const PatchConnection& c) {
                        return c.sourceModuleId == srcMod->instanceId &&
                               c.sourcePortId == static_cast<uint16_t>(srcIdx) &&
                               c.targetModuleId == dstMod->instanceId &&
                               c.targetPortId == static_cast<uint16_t>(dstIdx);
                    });
                if (already) continue;

                derived.push_back({ srcMod->instanceId, static_cast<uint16_t>(srcIdx),
                                    dstMod->instanceId, static_cast<uint16_t>(dstIdx),
                                    ConnectionType::Audio });
            }
            return derived;
        }

    } // namespace

    RuntimeSnapshot RuntimeCompiler::compile(const PatchDocument& doc, const ::Omega::Core::Ace::AceCatalog& catalog) {
        RuntimeSnapshot snapshot;
        snapshot.voicePlan.unitCount = 0;
        snapshot.voicePlan.connectionCount = 0;
        snapshot.voicePlan.modRouteCount = 0;

        std::map<uint32_t, uint8_t> instanceToUnitIdx;

        // 1. Compile Units (Modules)
        for (const auto& mod : doc.modules) {
            if (snapshot.voicePlan.unitCount >= CompiledVoicePlan::kMaxUnits) break;

            CompiledUnit unit;
            unit.nodeId = mod.instanceId;
            
            // Ace Catalog Resolution
            std::string catalogId = mapTypeToId(mod.typeId);
            auto const* info = catalog.getComponent(catalogId);
            
            if (info) {
                unit.implementationId = info->implementationId;
                unit.moduleId = info->id;   // WASM module manifestId for the voice renderer
                
                // Map PatchDocument parameters to engine slots
                for (size_t pIdx = 0; pIdx < info->parameters.size() && pIdx < CompiledUnit::kMaxParams; ++pIdx) {
                    const auto& pDef = info->parameters[pIdx];
                    bool valueSet = false;
                    for (const auto& pVal : mod.parameters) {
                        // [ERA 7.2.3]: Mapping logic for stable param IDs
                        if (static_cast<uint16_t>(pVal.id) == pIdx + 1) { 
                             unit.baseValues[pIdx] = pVal.value;
                             valueSet = true;
                             break;
                        }
                    }
                    if (!valueSet) unit.baseValues[pIdx] = pDef.defaultValue;
                    unit.stableParamIds[pIdx] = ::Omega::Core::ParamIdRegistry::getInstance().getStableId(pDef.id);
                }
            }

            instanceToUnitIdx[mod.instanceId] = static_cast<uint8_t>(snapshot.voicePlan.unitCount);
            snapshot.voicePlan.units[snapshot.voicePlan.unitCount++] = unit;
        }

        // 2. Compile Connections (Audio)
        // [P2-x] Sync matrix → grafo de audio: la UI solo escribe patchbayMatrix;
        // el grafo se deriva de los slots activos audio→audio cuando el doc no
        // trae connections explícitas. Las explícitas de un patch guardado mandan
        // (compatibilidad, sin doble enrutado). El amount se correlaciona con la
        // matrix en resolveConnectionAmount (ruta primaria ahora).
        auto compileConnections = [&](const std::vector<PatchConnection>& conns) {
            for (const auto& conn : conns) {
                if (conn.type != ConnectionType::Audio) continue;
                if (snapshot.voicePlan.connectionCount >= CompiledVoicePlan::kMaxConnections) break;

                if (instanceToUnitIdx.count(conn.sourceModuleId) && instanceToUnitIdx.count(conn.targetModuleId)) {
                    CompiledConnection cc;
                    cc.fromUnit = instanceToUnitIdx[conn.sourceModuleId];
                    cc.toUnit = instanceToUnitIdx[conn.targetModuleId];
                    cc.srcBus = static_cast<uint8_t>(conn.sourcePortId);
                    cc.dstBus = static_cast<uint8_t>(conn.targetPortId);
                    // [P1-3] Amount real desde el Patchbay Matrix ("instanceId.portId",
                    // nombres de puerto resueltos por catálogo). Sin slot activo → 1.0.
                    cc.amount = resolveConnectionAmount(doc, catalog, conn);
                    snapshot.voicePlan.connections[snapshot.voicePlan.connectionCount++] = cc;
                }
            }
        };
        // Sin copia incondicional (nota del revisor): las explícitas se iteran
        // por referencia; el vector derivado es temporal local sin copiar el doc.
        if (!doc.connections.empty()) {
            compileConnections(doc.connections);
        } else {
            compileConnections(deriveAudioConnections(doc, catalog));
        }

        // 2.1 Compile MIDI Targets (P0-2)
        // [Modular]: los módulos con puerto MIDI input (p. ej. omega_lab_monitor
        // `midi_events`) consumen el bus MIDI modular de la voz. Se detectan por
        // catálogo (ModPortType::MIDI && isInput), NO por conexiones del patch —
        // así el flujo sistema → midi_in → bus → target funciona aunque el cable
        // MIDI no esté declarado aún en el documento (los cables MIDI llegan en
        // una fase posterior).
        for (int i = 0; i < snapshot.voicePlan.unitCount && snapshot.voicePlan.midiTargetCount < CompiledVoicePlan::kMaxMidiTargets; ++i) {
            const auto& unit = snapshot.voicePlan.units[i];
            if (unit.moduleId.empty()) continue;
            const auto* info = catalog.getComponent(unit.moduleId);
            if (!info) continue;

            for (const auto& port : info->ports) {
                if (port.isInput && port.type == Modulation::ModPortType::MIDI) {
                    snapshot.voicePlan.midiTargets[snapshot.voicePlan.midiTargetCount++] = static_cast<uint8_t>(i);
                    break;
                }
            }
        }

        // 3. Topological Sorting (Delegated to GraphSorter)
        GraphSorter::sortExecutionOrder(snapshot.voicePlan);

        // 4. Global State Initialization
        for (int i = 0; i < 256; ++i) snapshot.globalParams[i] = 0.0f;
        snapshot.globalParams[0] = doc.masterGainDb;
        
        // 5. Aseptic Voice Configuration (Era 7.2.3)
        // [P1-3] El cutoff del patch (ruta "layer.a.cutoff" → módulo JunoFilter,
        // slot "cutoff" del catálogo) se propaga al VoiceConfig en vez del
        // literal 2000.0f. Sin módulo de filtro o sin parámetro → defaults.
        snapshot.voiceConfig.cutoff = resolveVoiceConfigCutoff(doc, catalog);
        snapshot.voiceConfig.vcaGain = doc.masterGainDb > -90.0f ? 0.8f : 0.0f;
        
        // 6. Verification & Finalization
        // [P1-3] IDs deterministas del contenido (antes: snapshotId=1234 falso y
        // planId nunca rellenado). snapshotId = hash del documento fuente;
        // planId = hash del plan compilado. Ambos estables entre recompilaciones
        // del mismo contenido y sensibles a cualquier cambio del patch.
        snapshot.snapshotId = hashPatchDocument(doc);
        snapshot.voicePlan.planId = hashVoicePlan(snapshot.voicePlan);
        snapshot.isValid = true;
        snapshot.voicePlan.isInitialised = true;

        return snapshot;
    }

    std::string RuntimeCompiler::mapTypeToId(::Omega::Core::Model::ModuleTypeId typeId) {
        // Delegate to the semantic mapping in PatchIdentifiers (osc_va_basic, flt_korg_35, ...)
        return ::Omega::Core::Model::mapTypeToId(typeId);
    }

} // namespace Compiler
} // namespace Core
} // namespace Omega
