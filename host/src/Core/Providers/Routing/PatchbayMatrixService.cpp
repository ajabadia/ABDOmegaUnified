#include "PatchbayMatrixService.h"
#include "ParamBindingRegistry.h"
#include "../../Modulation/Metadata/ModulationDescriptors.h"
#include "../../Modulation/Types/ModulationTypes.h"
#include "../../Voice/Plan/CompiledVoicePlan.h"

namespace Omega {
namespace Core {
namespace Service {

    /*
    void PatchbayMatrixService::compileMatrix(const Preset::OmegaPreset& preset, Voice::CompiledVoicePlan& outPlan, int maxSlots) {
        ...
    }
    */

    /*
    float PatchbayMatrixService::resolveEffectiveAmount(const Preset::PatchbayMatrixSlot& slot) {
        return slot.amount;
    }
    */

    uint32_t PatchbayMatrixService::resolveRuntimeParamId(Modulation::TargetStableId targetId) {
        return static_cast<uint32_t>(targetId);
    }

} // namespace Service
} // namespace Core
} // namespace Omega
