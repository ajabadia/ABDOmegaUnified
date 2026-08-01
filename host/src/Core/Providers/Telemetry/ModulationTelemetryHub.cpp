#include "ModulationTelemetryHub.h"
#include <cmath>
#include <algorithm>

namespace Omega::Core::Providers {

    ModulationTelemetryHub& ModulationTelemetryHub::getInstance() {
        static ModulationTelemetryHub instance;
        return instance;
    }

    ModulationTelemetryHub::ModulationTelemetryHub() {
        for (int i = 0; i < kMaxSignals; ++i) {
            mLatestValues[i].store(0.0f);
            mPeakValues[i].store(0.0f);
            mWritePos[i].store(0);
            for (auto& h : mHistory[i]) h.store(0.0f);
        }
    }

    void ModulationTelemetryHub::update(const std::array<float, kMaxSignals>& currentValues) {
        for (int i = 0; i < kMaxSignals; ++i) {
            pushSignal(i, currentValues[i]);
        }
    }

    void ModulationTelemetryHub::pushSignal(int i, float val) {
        if (i < 0 || i >= kMaxSignals) return;
        
        mLatestValues[i].store(val, std::memory_order_relaxed);
        
        float currentPeak = mPeakValues[i].load(std::memory_order_relaxed);
        float absVal = std::abs(val);
        if (absVal > currentPeak) {
            mPeakValues[i].store(absVal, std::memory_order_relaxed);
        }

        int pos = mWritePos[i].load(std::memory_order_relaxed);
        mHistory[i][pos].store(val, std::memory_order_relaxed);
        mWritePos[i].store((pos + 1) % kHistoryLength, std::memory_order_release);
    }

    float ModulationTelemetryHub::getPeakAndReset(int signalIndex) {
        if (signalIndex < 0 || signalIndex >= kMaxSignals) return 0.0f;
        return mPeakValues[signalIndex].exchange(0.0f, std::memory_order_relaxed);
    }

    float ModulationTelemetryHub::getLatest(int signalIndex) const {
        if (signalIndex < 0 || signalIndex >= kMaxSignals) return 0.0f;
        return mLatestValues[signalIndex].load(std::memory_order_relaxed);
    }

    void ModulationTelemetryHub::getHistory(int signalIndex, float* targetBuffer, int resolution) const {
        if (signalIndex < 0 || signalIndex >= kMaxSignals) return;
        
        int samplesToCopy = std::min(resolution, (int)kHistoryLength);
        int writePos = mWritePos[signalIndex].load(std::memory_order_acquire);
        
        for (int i = 0; i < samplesToCopy; ++i) {
            int readIdx = (writePos - samplesToCopy + i + kHistoryLength) % kHistoryLength;
            targetBuffer[i] = mHistory[signalIndex][readIdx].load(std::memory_order_relaxed);
        }
    }

} // namespace Omega::Core::Providers
