#include "GraphSorter.h"
#include <vector>

namespace Omega {
namespace Core {
namespace Compiler {

    void GraphSorter::sortExecutionOrder(::Omega::Core::Voice::CompiledVoicePlan& plan) {
        // [Era 7] Kahn's Algorithm Implementation
        // Determines the execution order based on module dependencies (connections)
        
        std::vector<int> inDegree(plan.unitCount, 0);
        for (int i = 0; i < plan.connectionCount; ++i) {
            if (plan.connections[i].toUnit < plan.unitCount) {
                inDegree[plan.connections[i].toUnit]++;
            }
        }

        std::vector<int> queue;
        for (int i = 0; i < plan.unitCount; ++i) {
            if (inDegree[i] == 0) queue.push_back(i);
        }

        int count = 0;
        while (!queue.empty()) {
            int u = queue.front();
            queue.erase(queue.begin());
            
            if (count < ::Omega::Core::Voice::CompiledVoicePlan::kMaxUnits) {
                plan.executionOrder[count++] = static_cast<uint8_t>(u);
            }

            for (int i = 0; i < plan.connectionCount; ++i) {
                if (plan.connections[i].fromUnit == u) {
                    int v = plan.connections[i].toUnit;
                    if (v < plan.unitCount) {
                        if (--inDegree[v] == 0) queue.push_back(v);
                    }
                }
            }
        }
    }

} // namespace Compiler
} // namespace Core
} // namespace Omega
