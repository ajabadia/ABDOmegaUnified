#pragma once

#include "CompiledVoicePlan.h"
#include <vector>

namespace Omega {
namespace Core {
namespace Compiler {

    /**
     * @brief Utility for topological sorting of the synthesis graph.
     * Implements Kahn's Algorithm to determine safe execution order.
     */
    class GraphSorter {
    public:
        /**
         * @brief Sorts modules in the plan to ensure zero-latency feedback-free paths.
         */
        static void sortExecutionOrder(::Omega::Core::Voice::CompiledVoicePlan& plan);
    };

} // namespace Compiler
} // namespace Core
} // namespace Omega
