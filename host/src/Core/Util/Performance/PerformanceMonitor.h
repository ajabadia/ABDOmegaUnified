#pragma once

#include <juce_core/juce_core.h>
#include <atomic>

namespace Omega::Core::Util {

/**
 * @brief Monitor para medir tiempos de ejecución en el Audio Thread de forma segura.
 * Usa atomics para evitar bloqueos y race conditions al leer desde el Message Thread.
 */
class PerformanceMonitor {
public:
    PerformanceMonitor(const juce::String& name) : mName(name) {}

    struct ScopedTimer {
        ScopedTimer(PerformanceMonitor& owner) 
            : mOwner(owner), mStart(juce::Time::getHighResolutionTicks()) {}
        
        ~ScopedTimer() {
            auto end = juce::Time::getHighResolutionTicks();
            auto elapsed = juce::Time::highResolutionTicksToSeconds(end - mStart);
            mOwner.update(static_cast<float>(elapsed * 1000.0)); // ms
        }

        PerformanceMonitor& mOwner;
        juce::int64 mStart;
    };

    void update(float ms) noexcept {
        mLastTime.store(ms, std::memory_order_relaxed);
        
        float currentMax = mMaxTime.load(std::memory_order_relaxed);
        while (ms > currentMax && !mMaxTime.compare_exchange_weak(currentMax, ms, std::memory_order_relaxed));
    }

    float getLastTimeMs() const noexcept { return mLastTime.load(std::memory_order_relaxed); }
    float getMaxTimeMs() const noexcept { return mMaxTime.load(std::memory_order_relaxed); }
    void resetMax() noexcept { mMaxTime.store(0.0f); }

private:
    juce::String mName;
    std::atomic<float> mLastTime{0.0f};
    std::atomic<float> mMaxTime{0.0f};
};

} // namespace Omega::Core::Util
