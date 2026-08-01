#pragma once

#include <vector>
#include <array>
#include <atomic>

/** [BUILD_FORCE_72] OMEGA Aseptic Motion Control (Era 7.2.3). **/
namespace Omega::Engine::Modulation {

    /**
     * @brief OMEGA Industrial Motion Recorder.
     * Records and plays back high-resolution parameter automation.
     * Purely dynamic: Adaptive to host sample rate and precision.
     */
    class MotionRecorder {
    public:
        MotionRecorder() = default;

        /**
         * @brief Updates the engine environment for the recorder.
         */
        void prepare(double sampleRate) {
            mSampleRate = sampleRate;
        }

        void startRecording() {
            mIsRecording = true;
            mReadPos = 0;
            mRecording.data.clear();
            
            // Adaptive pre-allocation (4 seconds at current sample rate)
            size_t initialSize = static_cast<size_t>(mSampleRate * 4.0);
            mRecording.data.reserve(initialSize);
        }

        void stopRecording() {
            mIsRecording = false;
            mRecording.active = true;
        }

        void recordValue(float value) {
            if (mIsRecording) {
                mRecording.data.push_back(value);
            }
        }

        float playValue(bool loop = true) {
            if (!mRecording.active || mRecording.data.empty()) return 0.0f;
            
            float val = mRecording.data[mReadPos++];
            if (mReadPos >= mRecording.data.size()) {
                if (loop) mReadPos = 0;
                else mReadPos = static_cast<int>(mRecording.data.size()) - 1;
            }
            return val;
        }

        bool isRecording() const { return mIsRecording; }
        void setPlaybackActive(bool active) { 
            mRecording.active = active; 
            if (!active) mReadPos = 0; 
        }

    private:
        struct Recording {
            std::vector<float> data;
            bool active = false;
        };

        Recording mRecording;
        std::atomic<bool> mIsRecording{false};
        size_t mReadPos = 0;
        double mSampleRate = 44100.0;
    };

} // namespace Omega::Engine::Modulation
