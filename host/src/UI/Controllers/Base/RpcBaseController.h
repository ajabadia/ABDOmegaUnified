#pragma once

#include <juce_core/juce_core.h>
#include "RpcCommandDispatcher.h"

namespace Omega {
namespace UI {

    /**
     * @brief Base class for specialized RPC controllers.
     */
    class RpcBaseController {
    public:
        virtual ~RpcBaseController() = default;

        /**
         * @brief Creates a standard OMEGA JSON-RPC response var.
         */
        static juce::var createResponse(const juce::var& type, const juce::var& requestId, const juce::var& error, const juce::var& payload = {}) {
            juce::DynamicObject::Ptr resp = new juce::DynamicObject();
            resp->setProperty("type", type);
            resp->setProperty("requestId", requestId);
            resp->setProperty("error", error);
            resp->setProperty("payload", payload);
            return juce::var(resp.get());
        }

        /**
         * @brief Standard error response helper.
         */
        static juce::var createError(const juce::var& type, const juce::var& requestId, const juce::String& message) {
            return createResponse(type, requestId, message);
        }
    };

} // namespace UI
} // namespace Omega
