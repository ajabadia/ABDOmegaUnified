# MOSS Z1-Era Expansion Specification

## Overview
The MOSS expansion extends the Prophecy's physical modeling capabilities into the polyphonic Z1 territory, providing specialized models for chromatic percussion, keyboards, and complex rhythmic synthesis.

## Components

### OSC-EP-001: Electric Piano Model
- **Description**: A physical model based on tines and reeds, with controllable strike force and pickup position.
- **Parameters**:
  - `tineDamping`: Decay speed of the metallic vibration.
  - `strikeForce`: Velocity-controlled hammer hardness.
  - `pickupPosition`: Harmonic balance (mellow vs bright).

### OSC-OR-001: Drawbar Organ Model
- **Description**: A synthesis model consisting of 9 virtual drawbars with rotary speaker emulation and percussion click.
- **Parameters**:
  - `drawbar1-9`: Harmonic levels.
  - `percOn`: Fast-decay harmonic attack simulation.

### PRP-SH-001: Multi-table Waveshaper
- **Description**: A nonlinear processing stage with 16 selectable transfer functions (Clip, Reso, Tube, S-Curve).
- **Parameters**:
  - `shaperMode`: Table selection.
  - `inputGain`: Amount of saturation.

### Prophecy Arpeggiator
- **Description**: A programmable rhythmic engine with dedicated gate time and velocity scaling per step.
- **Features**: "MOSS Pattern" mode with 64-step user sequences and latching logic.

### Advanced LFOs
- **Description**: High-resolution modulation sources with specialized "Prophecy" waveforms.
- **Waveforms**: 30+ shapes, including Random Step, Random Smooth, and human-vibrato emulations.
