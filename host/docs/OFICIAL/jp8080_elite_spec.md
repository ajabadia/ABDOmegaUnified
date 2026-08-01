# JP-8080 Elite Suite Specification

## Overview
The JP-8080 expansion introduces elite components that leverage high-feedback recursive paths and vocal-like filtering. These modules are designed for the "Elite Suite" synthesis engine.

## Components

### OSC-PM-010: Feedback Oscillator
- **Description**: A specialized sawtooth oscillator with a phase-feedback loop controlled by a resonant comb path.
- **Parameters**:
  - `frequency`: Base pitch.
  - `feedback`: Amount of phase modulation feedback from the previous sample.
  - `harmonics`: Comb filter length, affecting the resonant profile of the feedback.

### X-MOD: Cross-Modulation Controller
- **Description**: A high-speed modulation path that allows Oscillator 2 to modulate the frequency of Oscillator 1 at audio rates.
- **Parameters**:
  - `depth`: Amount of modulation [0.0 - 1.0].
  - `exponent`: Curvature of the FM (linear vs exponential).

### JP-FORMANT: Vocal Modulator
- **Description**: A bank of three parallel bandpass filters with specific resonant peaks (Formants) to emulate human vowel sounds.
- **Vowels**: A, E, I, O, U (controllable via the `Movement` macro).

### Motion Control: Gestural Recording
- **Description**: Sample-accurate recording of internal parameters (cutoff, pitch, resonance) with a 2-track playback system.
- **Features**: Synchronizable to project tempo, 16-step or absolute time recording.
