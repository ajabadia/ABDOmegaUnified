# OMEGA YAML Preset System Spec (v1)

El sistema de presets de OMEGA está diseñado para ser legible por humanos, versionable por Git y modular a través de la arquitectura **ACE (Atomic Component Engine)**.

## Estructura General

```yaml
omegapresetVersion: 1
id: PRESET-ID-UNIQUE
name: "Human Readable Name"
author: "Author Name"
engine: VirtualAnalog # VA, Spectral, Wavetable, etc.

global:
  masterGainDb: 0.0
  masterBypass: false

layers:
  - id: A
    name: "Layer Name"
    polyphony: 8
    
    # Parámetros de "Panel": Lo que el usuario ve en los sliders principales
    layerParams:
      cutoff: 2000.0             # Unified: was mainCutoffHz
      resonance: 0.2
      hpfPosition: 1             # 0: Boost, 1: Bypass, 2: 225Hz, 3: 700Hz
      vcaGateMode: false         # true: Gate, false: Env
      analogDrift: 0.15
      
      # Juno Modular hardware
      sawOn: true
      pulseOn: true
      subLevel: 0.5
      noiseLevel: 0.05
      pwmMode: 0                 # 0: Manual, 1: LFO
      pwmAmount: 0.5
      
      vcfEnvDepth: 0.5
      vcfModDepth: 0.0
      vcfKeyTracking: 0.5        # Unified: was vcfKybd
      vcfEnvInverted: false      # Unified: was vcfEnvInv
      dcoLfoDepth: 0.0
      
      # OMEGA Master LFO
      lfoRate: 5.0
      lfoWave: 0                 # 0: Triangle, 1: Saw, etc.
    
    # Arquitectura de Voz: La "maquinaria" interna (ACE)
    voiceArch:
      oscillators:
        - slot: 1
          componentId: OSC-VA-001 # Juno DCO
          enabled: true
          params: { tune: 0.0, pulsewidth: 0.5 }
      filters:
        - slot: 1
          componentId: FLT-VA-001 # IR3109
          enabled: true
          params: { cutoff: 2000.0, resonance: 0.2 }
      envelopes:
        - slot: 1
          componentId: ENV-ADSR-GEN
          role: amp # Define uso automático (Gain)
          params: { attack: 10.0, decay: 100.0, sustain: 0.8, release: 200.0 }
    
    # Grafo de Modulación (Avanzado - Fase 3)
    modulationGraph:
      nodes:
        - id: 1
          type: LFO
          name: "Vibrato LFO"
          params: { shape: sine, freq: 5.0 }
        - id: 2
          type: MIDIInput
          name: "ModWheel"
          params: { source: CC1 }
        - id: 3
          type: Multiply
          name: "Depth Mult"
        - id: 4
          type: VoicePitch
          name: "Pitch Sink"
      connections:
        - source: 1
          dest: 3
          destInput: 0
          amount: 1.0
        - source: 2
          dest: 3
          destInput: 1
          amount: 1.0
        - source: 3
          dest: 4
          destInput: 0
          amount: 0.5 # 50 cents max vibrato
```

## Conceptos Clave

1. **ACE Component IDs**: Cada `componentId` (ej. `OSC-VA-004`) mapea a una clase DSP específica.
2. **Hardened LayerParams**: OMEGA utiliza una estructura `LayerParams` en C++ que debe coincidir 1:1 con las llaves de `layerParams` en el YAML. La persistencia se garantiza mediante macros `SET_P` en `OmegaPreset.cpp`.
3. **Global vs Local**: Parámetros globales (Chorus, Master Volume) se inyectan en el nodo `params` del Root del preset, utilizando los prefijos `MASTERVOL`, `MASTERCHORUSMODE`, etc.
