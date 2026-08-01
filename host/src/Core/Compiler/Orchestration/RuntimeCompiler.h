#pragma once

#include "../../Model/Patch/PatchDocument.h"
#include "../../Model/Runtime/RuntimeSnapshot.h"
#include "../../Ace/Registry/AceCatalog.h"

namespace Omega {
namespace Core {
namespace Compiler {

    /**
     * @brief The industrial orchestration engine for Era 7.
     * Transforms a PatchDocument (Intent) into a RuntimeSnapshot (DSP Reality).
     */
    class RuntimeCompiler {
    public:
        /**
         * @brief Compiles a full document into an execution snapshot.
         * Performs unit resolution, connection mapping, and delegates sorting to GraphSorter.
         */
        static ::Omega::Core::Model::RuntimeSnapshot compile(
            const ::Omega::Core::Model::PatchDocument& doc,
            const ::Omega::Core::Ace::AceCatalog& catalog);

    private:
        /**
         * @brief Resolves the DSP implementation ID for a module type.
         */
        static uint32_t resolveImplementationId(::Omega::Core::Model::ModuleTypeId typeId);
        
        /**
         * @brief Maps internal Model IDs to Ace Catalog IDs.
         */
        static std::string mapTypeToId(::Omega::Core::Model::ModuleTypeId typeId);
    };

} // namespace Compiler
} // namespace Core
} // namespace Omega
