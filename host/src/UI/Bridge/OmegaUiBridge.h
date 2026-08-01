#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include <functional>
#include "RpcPresetController.h"
#include "RpcRackController.h"
#include "RpcHistoryController.h"
#include "RpcTelemetryController.h"
#include "RpcSystemController.h"
#include "RpcMetadataController.h"
#include "RpcInputController.h"
#include "RpcModulationController.h"
#include "RpcParameterController.h"
#include "RpcCommandDispatcher.h"

namespace Omega {
    namespace Core {
        namespace Ace { class AceCatalog; }
        namespace Service { class SystemSettingsManager; }
    }

    namespace Plugin { class OmegaAudioProcessor; }

    namespace UI {
        /**
         * @brief Communication Bridge between C++ and WebUI (React) - Era 7 Aseptic.
         */
        class OmegaUiBridge : private juce::AudioProcessorValueTreeState::Listener,
                              private juce::Timer 
        {
    public:
        using MessageCallback = std::function<void(const juce::String&)>;

        OmegaUiBridge(Plugin::OmegaAudioProcessor* processor,
                      Core::Ace::AceCatalog& catalog,
                      juce::AudioProcessorValueTreeState& apvts,
                      Core::Service::SystemSettingsManager& settings);
        ~OmegaUiBridge() override;

        juce::String handleMessageFromUi(const juce::String& jsonMessage);
        juce::var    handleMessageFromUiAsVar(const juce::String& type, const juce::var& requestId, const juce::var& payload);

        void setUiMessageCallback(MessageCallback callback);
        void setOnLoadCallback(std::function<void()> callback);
        
        void forceRepaint();
        
        Plugin::OmegaAudioProcessor& getProcessor() { return *mProcessor; }
        Core::Ace::AceCatalog& getCatalog() { return mCatalog; }

    private:
        void parameterChanged(const juce::String& parameterID, float newValue) override;
        void timerCallback() override;

        juce::var createResponse(const juce::var& type, const juce::var& requestId, const juce::var& payload = {});
        juce::var createError(const juce::var& errorCode, const juce::var& requestId, const juce::String& message);
        void notifyUi(const juce::var& notification);

        // Shared undo/redo state across preset, rack and history controllers
        std::unique_ptr<PatchHistoryState> mHistory;
        std::unique_ptr<RpcPresetController> mPresetController;
        std::unique_ptr<RpcRackController> mRackController;
        std::unique_ptr<RpcHistoryController> mHistoryController;
        std::unique_ptr<RpcTelemetryController> mTelemetryController;
        std::unique_ptr<RpcSystemController> mSystemController;
        std::unique_ptr<RpcMetadataController> mMetadataController;
        std::unique_ptr<RpcInputController> mInputController;
        std::unique_ptr<RpcModulationController> mModulationController;
        std::unique_ptr<RpcParameterController> mParameterController;
        RpcCommandDispatcher mDispatcher;

        Plugin::OmegaAudioProcessor* mProcessor;
        Core::Ace::AceCatalog& mCatalog;
        juce::AudioProcessorValueTreeState& mApvts;
        MessageCallback mUiCallback;
        std::function<void()> mOnLoadPreset;
        
        juce::var mScopeState;
        int mTelemetryFrameCounter = 0;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaUiBridge)
    };

    } // namespace UI
} // namespace Omega
