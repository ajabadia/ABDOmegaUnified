#pragma once

#include <vector>
#include <array>
#include <atomic>
#include <string>
#include <cstdint>

namespace Omega::Core::Providers {

    /**
     * @brief High-Performance Modulation Telemetry Hub.
     * Lock-free design for real-time visualization of DSP signals.
     */
    class ModulationTelemetryHub {
    public:
        static constexpr int kMaxSignals = 128; 
        static constexpr int kHistoryLength = 2048;

        static ModulationTelemetryHub& getInstance();

        /**
         * @brief Updates the current values from the Audio Thread.
         */
        void update(const std::array<float, kMaxSignals>& currentValues);

        /**
         * @brief Pushes an individual value into a telemetry cell.
         */
        void pushSignal(int i, float val);

        /**
         * @brief Gets the most recent peak value and resets it.
         */
        float getPeakAndReset(int signalIndex);

        /**
         * @brief Gets the most recent value of a signal.
         */
        float getLatest(int signalIndex) const;

        /**
         * @brief Copies a portion of history for visualization.
         */
        void getHistory(int signalIndex, float* targetBuffer, int resolution) const;

    private:
        ModulationTelemetryHub();

        std::array<std::atomic<float>, kMaxSignals> mLatestValues;
        std::array<std::atomic<float>, kMaxSignals> mPeakValues;
        std::array<std::array<std::atomic<float>, kHistoryLength>, kMaxSignals> mHistory;
        std::array<std::atomic<int>, kMaxSignals> mWritePos;
    };

} // namespace Omega::Core::Providers
