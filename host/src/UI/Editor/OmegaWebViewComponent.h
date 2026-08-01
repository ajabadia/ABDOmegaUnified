#pragma once

#include <juce_gui_extra/juce_gui_extra.h>
#include <optional>
#include <vector>
#include <cstring>
#include <cstddef>
#include <functional>
#include <mutex>
#include "../Core/BuildVersion.h"
#include "../Bridge/OmegaUiBridge.h"

#if JUCE_WEB_BROWSER_RESOURCE_PROVIDER_AVAILABLE
    // Embedded Web UI (staged at build time from host/ui). Must be included at
    // GLOBAL scope: the generated header declares its symbols in namespace
    // UiData (::UiData), and the definitions live there too. Including it inside
    // namespace Omega::UI would produce Omega::UI::UiData::* declarations and
    // break the link.
    #include "UiData.h"
#endif

namespace Omega {
    namespace UI {

#if JUCE_WEB_BROWSER_RESOURCE_PROVIDER_AVAILABLE
    namespace {
        // Lazily-built ZipFile over the embedded UI bytes. Makes the standalone
        // fully self-contained: every WebView resource is served from memory.
        //
        // WebView2 may request subresources concurrently from background threads
        // and juce::ZipFile::createStreamForEntry seeks the shared underlying
        // stream without locking, so all reads go through this mutex.
        std::mutex& getEmbeddedUiMutex()
        {
            static std::mutex m;
            return m;
        }

        juce::ZipFile& getEmbeddedUiZip()
        {
            static juce::MemoryBlock zipBlock (UiData::omega_ui_embedded_zip,
                                               (size_t) UiData::omega_ui_embedded_zipSize);
            static juce::MemoryInputStream zipStream (zipBlock, false);
            static juce::ZipFile zip (zipStream);
            return zip;
        }

        juce::String getWebMimeType (const juce::String& p)
        {
            if (p.endsWithIgnoreCase (".html")) return "text/html";
            if (p.endsWithIgnoreCase (".js"))   return "application/javascript";
            if (p.endsWithIgnoreCase (".css"))  return "text/css";
            if (p.endsWithIgnoreCase (".json")) return "application/json";
            if (p.endsWithIgnoreCase (".png"))  return "image/png";
            if (p.endsWithIgnoreCase (".svg"))  return "image/svg+xml";
            if (p.endsWithIgnoreCase (".jpg") || p.endsWithIgnoreCase (".jpeg")) return "image/jpeg";
            if (p.endsWithIgnoreCase (".woff2")) return "font/woff2";
            if (p.endsWithIgnoreCase (".ttf"))  return "font/ttf";
            return "application/octet-stream";
        }
    } // namespace
#endif

    /**
     * @brief Web-based UI Container for OMEGA.
     */
    class OmegaWebViewComponent : public juce::Component {
    public:
        OmegaWebViewComponent(OmegaUiBridge& bridge)
             : mBridge(bridge),
               mWebView(juce::WebBrowserComponent::Options{}
                .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
                .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2()
                    .withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory)
                        .getChildFile("OmegaSynth_WebView2_V75_Diagnostic")))
                .withNativeIntegrationEnabled(true)
                .withInitialisationData("omega", createInitData())
                .withEventListener("omega_rpc_query", [this](juce::var p) {
                    juce::Logger::writeToLog("!!! [BRIDGE] RPC QUERY RECEIVED via EVENT !!!");
                    juce::var type = p["type"];
                    juce::var rid = p["requestId"];
                    juce::var payload = p["payload"];
                    
                    juce::var response = this->mBridge.handleMessageFromUiAsVar(type.toString(), rid, payload);
                    // Send response back via the push channel
                    mWebView.evaluateJavascript("if(window.handleOmegaMessage) window.handleOmegaMessage(" + juce::JSON::toString(response) + ")", nullptr);
                })
#if JUCE_WEB_BROWSER_RESOURCE_PROVIDER_AVAILABLE
                .withResourceProvider([this](const juce::String& url) -> std::optional<juce::WebBrowserComponent::Resource> {
                    juce::String path = url;
                    if (path.contains("?")) path = path.upToFirstOccurrenceOf("?", false, false);

                    if (path.startsWith("https://juce.localhost/")) path = path.substring(23);
                    else if (path.startsWith("http://juce.localhost/")) path = path.substring(22);
                    else if (path.startsWith("/")) path = path.substring(1);
                    if (path.isEmpty() || path == "/") path = "index.html";

                    // ERA 7.2.3: Module Asset Resolution (Phase 13)
                    if (path.startsWith("modules/")) {
                        juce::String rest = path.substring(8);
                        juce::String componentId = rest.upToFirstOccurrenceOf("/", false, false);
                        juce::String resourcePath = rest.substring(componentId.length() + 1);

                        auto& catalog = mBridge.getCatalog();
                        auto stream = catalog.getResourceStream(componentId.toStdString(), resourcePath.toStdString());

                        if (stream) {
                            juce::MemoryBlock mb;
                            stream->readIntoMemoryBlock(mb);

                            auto getMime = [](const juce::String& p) {
                                if (p.endsWithIgnoreCase(".png")) return "image/png";
                                if (p.endsWithIgnoreCase(".svg")) return "image/svg+xml";
                                if (p.endsWithIgnoreCase(".jpg") || p.endsWithIgnoreCase(".jpeg")) return "image/jpeg";
                                return "application/octet-stream";
                            };

                            const auto* rawData = static_cast<const std::byte*>(mb.getData());
                            std::vector<std::byte> data(rawData, rawData + mb.getSize());
                            return juce::WebBrowserComponent::Resource { std::move(data), getMime(resourcePath) };
                        }
                    }

                    // Self-contained: every WebUI file (HTML, JS, CSS, SVG, fonts) is
                    // served from the ZIP embedded in the exe. No disk path involved.
                    // Case-insensitive lookup to match Windows FS semantics of the
                    // previous disk-based provider.
                    std::lock_guard<std::mutex> lock (getEmbeddedUiMutex());
                    auto& embeddedZip = getEmbeddedUiZip();
                    if (const auto* entry = embeddedZip.getEntry(path, true))
                    {
                        std::unique_ptr<juce::InputStream> stream (embeddedZip.createStreamForEntry (*entry));
                        if (stream != nullptr)
                        {
                            juce::MemoryBlock mb;
                            stream->readIntoMemoryBlock (mb);
                            const auto* rawData = static_cast<const std::byte*> (mb.getData());
                            std::vector<std::byte> data (rawData, rawData + mb.getSize());
                            return juce::WebBrowserComponent::Resource { std::move (data), getWebMimeType (path) };
                        }
                    }
                    return std::nullopt;
                })
#endif
               )
        {
            addAndMakeVisible(mWebView);
            
            mBridge.setUiMessageCallback([this](const juce::String& json) {
                mWebView.evaluateJavascript("if(window.handleOmegaMessage) window.handleOmegaMessage(" + json + ")", nullptr);
            });

            // Wire the preset-load callback: when a module is added, trigger forceRepaint()
            // which serializes the preset and broadcasts onStateUpdate to the WebUI.
            mBridge.setOnLoadCallback([this]() {
                mBridge.forceRepaint();
            });

            mWebView.goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
        }

        void resized() override {
            mWebView.setBounds(getLocalBounds());
        }

    private:
        static juce::var createInitData() {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("version", "1.0.0");
            obj->setProperty("build", OMEGA_BUILD_VERSION);
            obj->setProperty("timestamp", OMEGA_BUILD_TIMESTAMP);
            return juce::var(obj.get());
        }

        OmegaUiBridge& mBridge;
        juce::WebBrowserComponent mWebView;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaWebViewComponent)
    };

    } // namespace UI
} // namespace Omega
