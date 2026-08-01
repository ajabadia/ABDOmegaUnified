#include "RpcInputController.h"
#include "OmegaAudioProcessor.h"

namespace Omega {
namespace UI {

    RpcInputController::RpcInputController(Plugin::OmegaAudioProcessor* processor)
        : mProcessor(processor) {}

    void RpcInputController::registerCommands(RpcCommandDispatcher& dispatcher) {
        dispatcher.registerHandler("triggerNote", [this](const juce::var& rid, const juce::var& p) { return handleTriggerNote(rid, p); });
    }

    juce::var RpcInputController::handleTriggerNote(const juce::var& requestId, const juce::var& payload) {
        int note = (int)payload["note"];
        int vel = (int)payload["velocity"];
        bool on = (bool)payload["on"];
        
        if (mProcessor) {
            mProcessor->triggerNote(note, vel, on);
            
            // [Era 7 Aseptic] Legacy MidiMonitor recording removed.
            // UI already knows about this event as it originated from there.
            // Future telemetry should use ModulationTelemetryHub if needed.
        }
        
        return createResponse("TRIGGER_ACK", requestId, juce::var(), true);
    }

} // namespace UI
} // namespace Omega
