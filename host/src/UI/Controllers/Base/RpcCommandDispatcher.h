#pragma once

#include <juce_core/juce_core.h>
#include <functional>
#include <map>

namespace Omega {
namespace UI {

    /**
     * @brief Aseptic Command Dispatcher (Era 6).
     * Decouples the UI Bridge from individual controller methods.
     */
    class RpcCommandDispatcher {
    public:
        using CommandHandler = std::function<juce::var(const juce::var&, const juce::var&)>;

        void registerHandler(const juce::String& commandType, CommandHandler handler) {
            mHandlers[commandType] = handler;
        }

        juce::var dispatch(const juce::String& type, const juce::var& requestId, const juce::var& payload) {
            if (mHandlers.count(type)) {
                return mHandlers[type](requestId, payload);
            }
            return createError(type, requestId, "Unknown command type: " + type);
        }

    private:
        static juce::var createError(const juce::var& type, const juce::var& requestId, const juce::String& message) {
            juce::DynamicObject::Ptr resp = new juce::DynamicObject();
            resp->setProperty("type", "error");
            resp->setProperty("requestId", requestId);
            resp->setProperty("error", message);
            resp->setProperty("originalType", type);
            return juce::var(resp.get());
        }

        std::map<juce::String, CommandHandler> mHandlers;
    };

} // namespace UI
} // namespace Omega
