#pragma once

#include <cstdint>
#include <string>
#include <map>
#include <mutex>
#include <juce_core/juce_core.h>

/** [BUILD_FORCE_12] Aseptic ParamId Registry for OMEGA Era 7. **/
namespace Omega {
namespace Core {

    /**
     * @brief Bi-directional mapping between string identifiers and stable numeric IDs.
     * Essential for lock-free audio thread parameter resolution.
     */
    class ParamIdRegistry {
    public:
        static ParamIdRegistry& getInstance() {
            static ParamIdRegistry instance;
            return instance;
        }

        /**
         * @brief Returns a stable 32-bit ID for a given string identifier.
         */
        uint32_t getStableId(const std::string& id) {
            if (id.empty()) return 0;
            
            std::lock_guard<std::mutex> lock(mMutex);
            
            auto it = mStringToId.find(id);
            if (it != mStringToId.end())
                return it->second;
                
            // Generate a stable hash-based ID
            uint32_t stableId = static_cast<uint32_t>(juce::DefaultHashFunctions::generateHash(id, id.length()));
            
            // Ensure no collision (unlikely but safe)
            while (stableId == 0 || mIdToString.count(stableId)) {
                stableId++;
            }
            
            mStringToId[id] = stableId;
            mIdToString[stableId] = id;
            
            return stableId;
        }

        /**
         * @brief Returns the original string identifier for a stable ID (for diagnostics).
         */
        std::string getStringId(uint32_t stableId) const {
            if (stableId == 0) return "";
            
            std::lock_guard<std::mutex> lock(mMutex);
            
            auto it = mIdToString.find(stableId);
            return (it != mIdToString.end()) ? it->second : "UNKNOWN_ID_" + std::to_string(stableId);
        }

        /**
         * @brief Pre-registers all known core OMEGA parameters to ensure deterministic IDs.
         */
        void preRegisterCommonIds() {
            getStableId("cutoff");
            getStableId("resonance");
            getStableId("gain");
            getStableId("vcaGain");
            getStableId("pitch");
            getStableId("detune");
            getStableId("spread");

            getStableId("attack");
            getStableId("decay");
            getStableId("sustain");
            getStableId("release");
            getStableId("levelDb");
            getStableId("midiChannel");
            getStableId("sync");
            getStableId("trigger");
            getStableId("pwm");
            getStableId("gate");

            // --- Era 7 Environment Awareness ---
            getStableId("system.audio.sample_rate");
            getStableId("system.audio.block_size");
            getStableId("system.midi.protocol");
        }

    private:
        ParamIdRegistry() = default;
        
        mutable std::mutex mMutex;
        std::map<std::string, uint32_t> mStringToId;
        std::map<uint32_t, std::string> mIdToString;
    };

} // namespace Core
} // namespace Omega
