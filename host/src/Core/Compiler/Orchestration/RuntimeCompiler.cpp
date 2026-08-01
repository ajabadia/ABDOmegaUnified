#include "RuntimeCompiler.h"
#include "GraphSorter.h"
#include "ModulationTelemetryRegistry.h"
#include "ParamIdRegistry.h"
#include <algorithm>
#include <map>

namespace Omega {
namespace Core {
namespace Compiler {

    using namespace ::Omega::Core::Model;
    using namespace ::Omega::Core::Voice;

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
        for (const auto& conn : doc.connections) {
            if (conn.type != ConnectionType::Audio) continue;
            if (snapshot.voicePlan.connectionCount >= CompiledVoicePlan::kMaxConnections) break;

            if (instanceToUnitIdx.count(conn.sourceModuleId) && instanceToUnitIdx.count(conn.targetModuleId)) {
                CompiledConnection cc;
                cc.fromUnit = instanceToUnitIdx[conn.sourceModuleId];
                cc.toUnit = instanceToUnitIdx[conn.targetModuleId];
                cc.srcBus = static_cast<uint8_t>(conn.sourcePortId);
                cc.dstBus = static_cast<uint8_t>(conn.targetPortId);
                cc.amount = 1.0f;
                snapshot.voicePlan.connections[snapshot.voicePlan.connectionCount++] = cc;
            }
        }

        // 3. Topological Sorting (Delegated to GraphSorter)
        GraphSorter::sortExecutionOrder(snapshot.voicePlan);

        // 4. Global State Initialization
        for (int i = 0; i < 256; ++i) snapshot.globalParams[i] = 0.0f;
        snapshot.globalParams[0] = doc.masterGainDb;
        
        // 5. Aseptic Voice Configuration (Era 7.2.3)
        snapshot.voiceConfig.cutoff = 2000.0f;
        snapshot.voiceConfig.vcaGain = doc.masterGainDb > -90.0f ? 0.8f : 0.0f;
        
        // 6. Verification & Finalization
        snapshot.snapshotId = 1234; 
        snapshot.isValid = true;
        snapshot.voicePlan.isInitialised = true;

        return snapshot;
    }

    std::string RuntimeCompiler::mapTypeToId(::Omega::Core::Model::ModuleTypeId typeId) {
        // Placeholder for semantic mapping
        return "osc_va"; 
    }

} // namespace Compiler
} // namespace Core
} // namespace Omega
