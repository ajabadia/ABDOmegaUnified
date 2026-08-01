#include "EngineConfigManager.h"

namespace Omega::Core::Service {

    void EngineConfigManager::recompile() {
        auto nextIdx = (mCurrentSnapshot.load() == &mSnapshots[0]) ? 1 : 0;
        mSnapshots[nextIdx] = Compiler::RuntimeCompiler::compile(mPatchDocument, mCatalog);
        
        mCurrentSnapshot.store(&mSnapshots[nextIdx]);
        mEngine.pushConfigUpdate(); // Notify audio thread
    }

} // namespace Omega::Core::Service
