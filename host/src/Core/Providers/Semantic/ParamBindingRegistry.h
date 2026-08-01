#pragma once

#include <functional>
#include <map>
#include <juce_core/juce_core.h>
#include "EngineConfig.h"

namespace Omega::Core::Service {

    /**
     * @brief Registry for mapping stable parameter IDs to engine configuration actions.
     * VA 7.2: Unifies the bridge between high-level manifests and real-time DSP settings.
     */
    class ParamBindingRegistry {
    public:
        using BindingAction = std::function<void(VoiceConfig&, float)>;
        using GlobalBindingAction = std::function<void(EngineConfig&, float)>;

        static ParamBindingRegistry& getInstance();

        /**
         * @brief Applies a per-voice parameter update.
         */
        void apply(const juce::String& paramId, float value, VoiceConfig& cfg);

        /**
         * @brief Applies a global engine parameter update.
         */
        void applyGlobal(const juce::String& paramId, float value, EngineConfig& cfg);

    private:
        ParamBindingRegistry();
        void registerStandardBindings();

        std::map<juce::String, BindingAction> mBindings;
        std::map<juce::String, GlobalBindingAction> mGlobalBindings;
    };

} // namespace Omega::Core::Service
