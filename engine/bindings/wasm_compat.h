#pragma once
#ifdef __EMSCRIPTEN__

#include <emscripten/emscripten.h>
#include <atomic>
#include <map>
#include <string>
#include <memory>
#include <cmath>

namespace juce
{
    class String;

    // 1. Clase base polimórfica para parámetros
    class RangedAudioParameter
    {
    public:
        virtual ~RangedAudioParameter() = default;
    };

    // 2. Struct de IDs de parámetros
    struct ParameterID
    {
        ParameterID() = default;
        ParameterID (const juce::String&, int) {}
        ParameterID (const char*, int) {}
    };

    // 3. Mock de selectores de opción (formas de onda, etc.)
    class AudioParameterChoice : public RangedAudioParameter
    {
    public:
        AudioParameterChoice() = default;
        template <typename... Args> AudioParameterChoice (Args&&...) {}

        int getIndex() const noexcept { return static_cast<int>(std::round(value.load())); }
        std::atomic<float> value{0.0f};
    };

    // 4. Mock de parámetros flotantes
    class AudioParameterFloat : public RangedAudioParameter
    {
    public:
        AudioParameterFloat() = default;
        template <typename... Args> AudioParameterFloat (Args&&...) {}

        std::atomic<float> value{0.0f};
    };

    // 5. Mock de APVTS (AudioProcessorValueTreeState)
    class AudioProcessorValueTreeState
    {
    public:
        struct ParameterLayout
        {
            template <typename... Args>
            void add (Args&&...) {}
        };

        AudioProcessorValueTreeState() = default;

        template <typename... Args>
        AudioProcessorValueTreeState (Args&&...) {}

        std::atomic<float>* getRawParameterValue (const char* paramID)
        {
            auto it = params.find (paramID);
            if (it == params.end())
            {
                auto val = std::make_unique<std::atomic<float>>(0.0f);
                auto* ptr = val.get();
                params[paramID] = std::move (val);
                return ptr;
            }
            return it->second.get();
        }

    private:
        std::map<std::string, std::unique_ptr<std::atomic<float>>> params;
    };
}
#endif
