# Technical Specification: Korg Prophecy Advanced MOSS Modules

## Overview
This document details the refinements and new specialized modules added to the OMEGA MOSS engine (Korg Prophecy style).

## Oscillators

### [OSC-PD-001] Unified Wind Model
Refined versions of the Brass and Reed physical models.
- **Lip/Reed Table**: Cubic non-linearity approximation: $f(x) = x - x^3/3$.
- **Saturation**: Dynamic `tanh` saturation based on breath pressure.

### [OSC-PM-008] Refined VPM
Variable Phase Modulation with 2-operator architecture.
- **Wave Shaping**: Modulator signal is processed through a soft-clipping shaper before modulating the carrier.
- **Feedback**: Integrated self-feedback loop for digital grit.

### [OSC-PM-009] Noise + Comb
The classic Prophecy industrial oscillator.
- **Source**: White noise.
- **Loop**: Tunable feedback delay line with integrated Low-Pass Filter (Damping).

## Filters

### [FLT-RES-001] Resonant Filter Bank
- **Architecture**: 6 parallel 2-pole resonant peak filters.
- **Controls**: Master Cutoff, Spread (spacing), Peak Resonance, Gain.

## Modulation & Expression

### [ENV-MULTI-001] Multi-stage Envelope
- **Stages**: 5-stage Level/Time ADBSR.
- **Curvature**: Variable curvature per stage (Linear, Log, Exp).

### [MOD-PROP-001] Vector Control & Ribbon
- **Vector Control**: 2D modulation mapping (X/Y).
- **Ribbon Controller**: High-resolution pitch and cutoff modulation via CC.
