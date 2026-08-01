# OMEGA MIDI 2.0 (UMP) Hybrid Layer Specification

## 1. Overview
OMEGA utilizes the **Universal MIDI Packet (UMP)** format introduced in JUCE 8 to support the MIDI 2.0 protocol. This layer ensures that the synthesis engine can handle high-resolution expressive data while remaining fully compatible with legacy MIDI 1.0 environments.

## 2. Architecture: The Hybrid Switcher
The system does not force a single protocol. Instead, it employs a **Runtime Auto-Detection** mechanism within the `OmegaAudioProcessor`.

### 2.1 Detection Logic
At the beginning of each `processBlock`, the engine inspects the `juce::MidiBuffer` format:
- **`MidiBuffer::Format::midi1`**: Routed to `Midi1InputAdapter`.
- **`MidiBuffer::Format::universalMidiPackets`**: Routed to `Midi2InputAdapter`.

### 2.2 Data Normalization
Regardless of the protocol, all MIDI data is normalized into the `OmegaInput` event buffer:
- **Velocity**: MIDI 1.0 (7-bit) is scaled to `[0.0, 1.0]`. MIDI 2.0 (16-bit) is mapped directly to `[0.0, 1.0]` for maximum precision in the modulation graph.
- **Controllers (CC)**: MIDI 1.0 (7-bit) -> `[0.0, 1.0]`. MIDI 2.0 (32-bit) -> `[0.0, 1.0]`.
- **Pitch Bend**: Automatic 14-bit to 32-bit reconciliation based on the active adapter.

## 3. Component Breakdown

### 3.1 `Midi1InputAdapter`
- **Responsibility**: Legacy byte-stream processing.
- **Precision**: 7-bit quantization (standard).
- **Format**: Standard `juce::MidiMessage` iteration.

### 3.2 `Midi2InputAdapter`
- **Responsibility**: UMP (32-bit words) processing.
- **Precision**: Up to 32-bit for controllers and 16-bit for velocity.
- **Implementation**: Utilizes `juce::universal_midi_packets::View` for efficient, lock-free iteration over 32-bit words.
- **Support**: Handles UMP Type 2 (Encapsulated MIDI 1.0) and UMP Type 4 (Native MIDI 2.0).

## 4. Host Compatibility
- **VST3 / AU**: Supported in JUCE 8 compatible hosts (e.g., Cubase 13+, Logic Pro 11+).
- **Standalone**: Automatically enables UMP if the OS MIDI subsystem supports it (Windows WinRT MIDI / macOS CoreMIDI 2.0).

## 5. Future Roadmap
- **MPE Integration**: Mapping UMP per-note controllers to individual voice modulation targets.
- **Protocol Negotiation**: Extending the bridge to report OMEGA's MIDI 2.0 capabilities to the host.
