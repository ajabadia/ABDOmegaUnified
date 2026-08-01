#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include "../Plugin/OmegaAudioProcessor.h"
#include "../Bridge/OmegaUiBridge.h"
#include "OmegaWebViewComponent.h"

namespace Omega {
    namespace UI {

    class OmegaMainEditor : public juce::AudioProcessorEditor {
    public:
        OmegaMainEditor(Plugin::OmegaAudioProcessor& p, OmegaUiBridge& bridge)
            : AudioProcessorEditor(&p),
              mWebView(bridge)
        {
            addAndMakeVisible(mWebView);
            setSize(1400, 1000);
        }

        ~OmegaMainEditor() override {}

        void resized() override
        {
            mWebView.setBounds(getLocalBounds());
        }

        void paint(juce::Graphics& g) override
        {
            g.fillAll(juce::Colours::black); 
        }

    private:
        OmegaWebViewComponent mWebView;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaMainEditor)
    };

} // namespace UI
} // namespace Omega
