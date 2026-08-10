/**
 * ACEMM CATALOG — GENERADO AUTOMÁTICAMENTE desde modules/ (estantería canónica).
 * NO EDITAR: regenera con `node scripts/generate_acemm_catalog.mjs`.
 * La fuente de la verdad de los manifiestos es modules/<id>/<id>.acemm.
 * Destino: web\src\services\acemmCatalog.generated.ts
 */
export const GENERATED_ACEMM_CATALOG: Record<string, any> = {
  "440demo": {
    "id": "440demo",
    "name": "440 DEMO",
    "description": "",
    "metadata": {
      "name": "440 DEMO",
      "family": "utility",
      "version": "1.0.0",
      "rack": {
        "hp": 4,
        "units": "1U",
        "slot": "upper"
      }
    },
    "rack": {
      "slot": "upper",
      "hp": 4
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "405064857271ef6072636e0a2223fce5290367dde2433b72a97db7b16d873a93",
      "size": 2372
    },
    "wasmUrl": "modules/440demo/440demo.wasm",
    "manifestUrl": "modules/440demo/440demo.acemm",
    "params": {
      "enabled": {
        "label": "Enable Tone",
        "min": 0,
        "max": 1,
        "default": 1,
        "choices": [
          {
            "label": "OFF",
            "value": 0
          },
          {
            "label": "ON",
            "value": 1
          }
        ]
      },
      "amplitude": {
        "label": "Amplitude",
        "min": 0,
        "max": 1,
        "default": 0.5,
        "exponent": 2,
        "units": ""
      },
      "led_rate": {
        "label": "LED Rate",
        "min": 1,
        "max": 30,
        "default": 8,
        "exponent": 1,
        "units": "hz"
      }
    },
    "ui": {
      "dimensions": {
        "width": 60,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "main",
            "label": "Tone",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 50,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "sw_enable",
          "bind": "enabled",
          "pos": {
            "x": 30,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "switch",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 40
            },
            "attachments": [
              {
                "type": "label",
                "text": "ON"
              }
            ]
          }
        },
        {
          "id": "led_act",
          "bind": "led_activity",
          "pos": {
            "x": 30,
            "y": 75
          },
          "presentation": {
            "container": "main",
            "component": "led",
            "variant": "orange",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "ACT"
              }
            ]
          }
        },
        {
          "id": "port_out",
          "bind": "audio_out",
          "pos": {
            "x": 30,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "OUT"
              }
            ]
          }
        },
        {
          "id": "k_amplitude",
          "bind": "amplitude",
          "pos": {
            "x": 30,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_led_rate",
          "bind": "led_rate",
          "pos": {
            "x": 30,
            "y": 140
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        }
      ]
    }
  },
  "adsr": {
    "id": "adsr",
    "name": "Omega ADSR Envelope",
    "description": "",
    "metadata": {
      "name": "Omega ADSR Envelope",
      "family": "control",
      "version": "1.0.0",
      "rack": {
        "hp": 8,
        "units": "3U",
        "slot": "lower"
      }
    },
    "rack": {
      "slot": "lower",
      "hp": 8
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "32146482ef8e649946c9c1becf1ade9c1d5e438f4c2fd6d149b190cfaeca01f9",
      "size": 3255
    },
    "wasmUrl": "modules/adsr/adsr.wasm",
    "manifestUrl": "modules/adsr/adsr.acemm",
    "params": {
      "attack": {
        "label": "Attack",
        "min": 0.5,
        "max": 10000,
        "default": 5,
        "exponent": 3,
        "units": "ms"
      },
      "decay": {
        "label": "Decay",
        "min": 1,
        "max": 10000,
        "default": 200,
        "exponent": 3,
        "units": "ms"
      },
      "sustain": {
        "label": "Sustain",
        "min": 0,
        "max": 1,
        "default": 0.6,
        "exponent": 1,
        "units": ""
      },
      "release": {
        "label": "Release",
        "min": 1,
        "max": 10000,
        "default": 400,
        "exponent": 3,
        "units": "ms"
      },
      "depth": {
        "label": "Depth",
        "min": 0,
        "max": 1,
        "default": 1,
        "exponent": 1,
        "units": ""
      }
    },
    "ui": {
      "dimensions": {
        "width": 120,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "main",
            "label": "ADSR",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 110,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "knob_attack",
          "bind": "attack",
          "pos": {
            "x": 30,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "A"
              }
            ]
          }
        },
        {
          "id": "knob_decay",
          "bind": "decay",
          "pos": {
            "x": 60,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "D"
              }
            ]
          }
        },
        {
          "id": "knob_sustain",
          "bind": "sustain",
          "pos": {
            "x": 90,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "S"
              }
            ]
          }
        },
        {
          "id": "knob_release",
          "bind": "release",
          "pos": {
            "x": 30,
            "y": 55
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "R"
              }
            ]
          }
        },
        {
          "id": "port_gate",
          "bind": "gate_in",
          "pos": {
            "x": 30,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "GATE"
              }
            ]
          }
        },
        {
          "id": "port_out",
          "bind": "out",
          "pos": {
            "x": 60,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "OUT"
              }
            ]
          }
        },
        {
          "id": "k_depth",
          "bind": "depth",
          "pos": {
            "x": 30,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        }
      ]
    }
  },
  "lfo": {
    "id": "lfo",
    "name": "Omega LFO",
    "description": "",
    "metadata": {
      "name": "Omega LFO",
      "family": "control",
      "version": "1.0.0",
      "rack": {
        "hp": 8,
        "units": "3U",
        "slot": "lower"
      }
    },
    "rack": {
      "slot": "lower",
      "hp": 8
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "25440833bfe9a2e28e5faf229261e6d777423ccc1937de1cd6fb40fc0ce94598",
      "size": 2664
    },
    "wasmUrl": "modules/lfo/lfo.wasm",
    "manifestUrl": "modules/lfo/lfo.acemm",
    "params": {
      "rate": {
        "label": "Rate",
        "min": 0.01,
        "max": 30,
        "default": 2,
        "exponent": 2,
        "units": "hz"
      },
      "shape": {
        "label": "Shape",
        "min": 0,
        "max": 4,
        "default": 0,
        "choices": [
          {
            "label": "Sine",
            "value": 0
          },
          {
            "label": "Triangle",
            "value": 1
          },
          {
            "label": "Saw",
            "value": 2
          },
          {
            "label": "Square",
            "value": 3
          },
          {
            "label": "S&H",
            "value": 4
          }
        ]
      },
      "amount": {
        "label": "Amount",
        "min": 0,
        "max": 1,
        "default": 0.5,
        "exponent": 2,
        "units": ""
      },
      "sync_to_gate": {
        "label": "Sync to Gate",
        "min": 0,
        "max": 1,
        "default": 0,
        "choices": [
          {
            "label": "OFF",
            "value": 0
          },
          {
            "label": "ON",
            "value": 1
          }
        ]
      }
    },
    "ui": {
      "dimensions": {
        "width": 60,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "main",
            "label": "LFO",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 50,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "knob_rate",
          "bind": "rate",
          "pos": {
            "x": 30,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "RATE"
              }
            ]
          }
        },
        {
          "id": "knob_shape",
          "bind": "shape",
          "pos": {
            "x": 30,
            "y": 55
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "SHAPE"
              }
            ]
          }
        },
        {
          "id": "port_out",
          "bind": "out",
          "pos": {
            "x": 30,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "OUT"
              }
            ]
          }
        },
        {
          "id": "k_amount",
          "bind": "amount",
          "pos": {
            "x": 30,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_sync",
          "bind": "sync_to_gate",
          "pos": {
            "x": 30,
            "y": 140
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        }
      ]
    }
  },
  "midi_2_cv": {
    "id": "midi_2_cv",
    "name": "MIDI 2 CV",
    "description": "",
    "metadata": {
      "name": "MIDI 2 CV",
      "family": "control",
      "version": "1.0.0",
      "rack": {
        "hp": 8,
        "units": "1U",
        "slot": "upper"
      }
    },
    "rack": {
      "slot": "upper",
      "hp": 8
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "3d74a6bbc1056ebbc2a82acf18d6711bc8d139ce58de2ecc056257a67fa404bd",
      "size": 3391
    },
    "wasmUrl": "modules/midi_2_cv/midi_2_cv.wasm",
    "manifestUrl": "modules/midi_2_cv/midi_2_cv.acemm",
    "params": {},
    "ui": {
      "dimensions": {
        "width": 120,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "main",
            "label": "CV/GATE",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 110,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "port_cv_out",
          "bind": "cv_out",
          "pos": {
            "x": 10,
            "y": 65
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 22,
              "h": 22
            },
            "attachments": [
              {
                "type": "label",
                "text": "CV"
              }
            ]
          }
        },
        {
          "id": "port_gate_out",
          "bind": "gate_out",
          "pos": {
            "x": 40,
            "y": 65
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "silver",
            "size": {
              "w": 22,
              "h": 22
            },
            "attachments": [
              {
                "type": "label",
                "text": "GATE"
              }
            ]
          }
        },
        {
          "id": "port_vel_out",
          "bind": "vel_out",
          "pos": {
            "x": 70,
            "y": 65
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 22,
              "h": 22
            },
            "attachments": [
              {
                "type": "label",
                "text": "VEL"
              }
            ]
          }
        },
        {
          "id": "port_at_out",
          "bind": "at_out",
          "pos": {
            "x": 100,
            "y": 65
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 22,
              "h": 22
            },
            "attachments": [
              {
                "type": "label",
                "text": "AT"
              }
            ]
          }
        },
        {
          "id": "k_midi_channel",
          "bind": "midi_channel",
          "pos": {
            "x": 10,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_glide_mode",
          "bind": "glide_mode",
          "pos": {
            "x": 20,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_glide_time",
          "bind": "glide_time",
          "pos": {
            "x": 30,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_bend_range",
          "bind": "bend_range",
          "pos": {
            "x": 40,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_at_mode",
          "bind": "at_mode",
          "pos": {
            "x": 50,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        }
      ]
    }
  },
  "midi_in": {
    "id": "midi_in",
    "name": "GLOBAL MIDI INPUT",
    "description": "",
    "metadata": {
      "name": "GLOBAL MIDI INPUT",
      "family": "io",
      "version": "1.0.0",
      "rack": {
        "hp": 4,
        "units": "1U",
        "slot": "upper"
      }
    },
    "rack": {
      "slot": "upper",
      "hp": 4
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "43c8d528b2197f8592cad04a2b3412b3ad1021a3d8b48a61ae0b734b1a007007",
      "size": 864
    },
    "wasmUrl": "modules/midi_in/midi_in.wasm",
    "manifestUrl": "modules/midi_in/midi_in.acemm",
    "params": {},
    "ui": {
      "dimensions": {
        "width": 60,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "main",
            "label": "Bridge",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 50,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "port_out",
          "bind": "midi_out",
          "pos": {
            "x": 25,
            "y": 20
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "industrial",
            "size": {
              "w": 30,
              "h": 30
            },
            "attachments": [
              {
                "type": "label",
                "text": "DATA"
              }
            ]
          }
        },
        {
          "id": "led_act",
          "bind": "led_activity",
          "pos": {
            "x": 25,
            "y": 75
          },
          "presentation": {
            "container": "main",
            "component": "led",
            "variant": "orange",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "ACT"
              }
            ]
          }
        }
      ]
    }
  },
  "midi_trigger": {
    "id": "midi_trigger",
    "name": "MIDI TRIGGER",
    "description": "",
    "metadata": {
      "name": "MIDI TRIGGER",
      "family": "midi",
      "version": "1.0.0",
      "rack": {
        "hp": 12,
        "units": "1U",
        "slot": "upper"
      }
    },
    "rack": {
      "slot": "upper",
      "hp": 12
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "5e826d5c94d176fe485c6f4e32a01b6af7f045593fb3d64e1da7d94ceb34ce85",
      "size": 1718
    },
    "wasmUrl": "modules/midi_trigger/midi_trigger.wasm",
    "manifestUrl": "modules/midi_trigger/midi_trigger.acemm",
    "params": {},
    "ui": {
      "dimensions": {
        "width": 180,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "left",
            "label": "Displays",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 80,
              "h": 130
            },
            "variant": "inset"
          },
          {
            "id": "right",
            "label": "Performance",
            "pos": {
              "x": 90,
              "y": 5
            },
            "size": {
              "w": 85,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "d_note",
          "bind": "note_idx",
          "pos": {
            "x": 5,
            "y": 15
          },
          "presentation": {
            "container": "left",
            "component": "display",
            "variant": "oled",
            "size": {
              "w": 70,
              "h": 36
            },
            "attachments": [
              {
                "type": "label",
                "text": "NOTE"
              }
            ]
          }
        },
        {
          "id": "d_oct",
          "bind": "octave",
          "pos": {
            "x": 5,
            "y": 65
          },
          "presentation": {
            "container": "left",
            "component": "display",
            "variant": "led",
            "size": {
              "w": 70,
              "h": 36
            },
            "attachments": [
              {
                "type": "label",
                "text": "OCTAVE"
              }
            ]
          }
        },
        {
          "id": "b_trig",
          "bind": "trigger",
          "pos": {
            "x": 8,
            "y": 15
          },
          "presentation": {
            "container": "right",
            "component": "button",
            "variant": "cyan",
            "size": {
              "w": 34,
              "h": 34
            },
            "attachments": [
              {
                "type": "label",
                "text": "TRIG"
              }
            ]
          }
        },
        {
          "id": "port_out",
          "bind": "midi_out",
          "pos": {
            "x": 10,
            "y": 70
          },
          "presentation": {
            "container": "right",
            "component": "port",
            "variant": "industrial",
            "size": {
              "w": 30,
              "h": 30
            },
            "attachments": [
              {
                "type": "label",
                "text": "MIDI"
              }
            ]
          }
        },
        {
          "id": "s_vel",
          "bind": "velocity",
          "pos": {
            "x": 55,
            "y": 15
          },
          "presentation": {
            "container": "right",
            "component": "slider-v",
            "variant": "industrial",
            "size": {
              "w": 18,
              "h": 85
            },
            "attachments": [
              {
                "type": "label",
                "text": "VEL"
              }
            ]
          }
        }
      ]
    }
  },
  "omega_lab_monitor": {
    "id": "omega_lab_monitor",
    "name": "OMEGA LAB TELEMETRY MONITOR",
    "description": "",
    "metadata": {
      "name": "OMEGA LAB TELEMETRY MONITOR",
      "family": "utility",
      "version": "1.0.0",
      "rack": {
        "hp": 16,
        "units": "3U",
        "slot": "lower"
      }
    },
    "rack": {
      "slot": "lower",
      "hp": 16
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "fdb207b98c43a6086688b5e769281548ec30d5454e44226882f7f486da3c8a6d",
      "size": 3385
    },
    "wasmUrl": "modules/omega_lab_monitor/omega_lab_monitor.wasm",
    "manifestUrl": "modules/omega_lab_monitor/omega_lab_monitor.acemm",
    "params": {
      "timebase": {
        "label": "Time/Div",
        "min": 0.1,
        "max": 10,
        "default": 1,
        "exponent": 1,
        "units": "x"
      },
      "gain": {
        "label": "Volt/Div",
        "min": 0.1,
        "max": 10,
        "default": 1,
        "exponent": 1,
        "units": "v"
      },
      "offset": {
        "label": "Offset",
        "min": -1,
        "max": 1,
        "default": 0,
        "units": "v"
      },
      "mode": {
        "label": "Mode",
        "min": 0,
        "max": 3,
        "default": 0,
        "choices": [
          {
            "label": "Scope",
            "value": 0
          },
          {
            "label": "Spectrum",
            "value": 1
          },
          {
            "label": "XY",
            "value": 2
          },
          {
            "label": "Meter",
            "value": 3
          }
        ]
      }
    },
    "ui": {
      "dimensions": {
        "width": 240,
        "height": 420
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "scope_sec",
            "label": "Oscilloscope Waveform Display",
            "pos": {
              "x": 5,
              "y": 10
            },
            "size": {
              "w": 230,
              "h": 185
            },
            "variant": "inset"
          },
          {
            "id": "meter_sec",
            "label": "Digital Meter & Voltage Telemetry",
            "pos": {
              "x": 5,
              "y": 200
            },
            "size": {
              "w": 230,
              "h": 65
            },
            "variant": "panel"
          },
          {
            "id": "ctrl_sec",
            "label": "Input Jacks & Calibration",
            "pos": {
              "x": 5,
              "y": 270
            },
            "size": {
              "w": 230,
              "h": 140
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "scope_1",
          "bind": "audio_in",
          "pos": {
            "x": 5,
            "y": 10
          },
          "presentation": {
            "container": "scope_sec",
            "component": "scope",
            "variant": "phosphor",
            "size": {
              "w": 220,
              "h": 165
            }
          }
        },
        {
          "id": "d_volts",
          "bind": "signal_telemetry",
          "pos": {
            "x": 5,
            "y": 12
          },
          "presentation": {
            "container": "meter_sec",
            "component": "display",
            "variant": "oled",
            "size": {
              "w": 150,
              "h": 42
            },
            "attachments": [
              {
                "type": "label",
                "text": "VOLTAGE / FREQ"
              }
            ]
          }
        },
        {
          "id": "led_clip",
          "bind": "clip_status",
          "pos": {
            "x": 165,
            "y": 20
          },
          "presentation": {
            "container": "meter_sec",
            "component": "led",
            "variant": "orange",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "CLIP"
              }
            ]
          }
        },
        {
          "id": "port_audio",
          "bind": "audio_in",
          "pos": {
            "x": 10,
            "y": 15
          },
          "presentation": {
            "container": "ctrl_sec",
            "component": "port",
            "variant": "audio",
            "size": {
              "w": 30,
              "h": 30
            },
            "attachments": [
              {
                "type": "label",
                "text": "AUDIO"
              }
            ]
          }
        },
        {
          "id": "port_cv",
          "bind": "cv_in",
          "pos": {
            "x": 60,
            "y": 15
          },
          "presentation": {
            "container": "ctrl_sec",
            "component": "port",
            "variant": "cv",
            "size": {
              "w": 30,
              "h": 30
            },
            "attachments": [
              {
                "type": "label",
                "text": "CV IN"
              }
            ]
          }
        },
        {
          "id": "port_thru",
          "bind": "thru_out",
          "pos": {
            "x": 10,
            "y": 75
          },
          "presentation": {
            "container": "ctrl_sec",
            "component": "port",
            "variant": "industrial",
            "size": {
              "w": 30,
              "h": 30
            },
            "attachments": [
              {
                "type": "label",
                "text": "THRU"
              }
            ]
          }
        },
        {
          "id": "port_trig",
          "bind": "trig_in",
          "pos": {
            "x": 60,
            "y": 75
          },
          "presentation": {
            "container": "ctrl_sec",
            "component": "port",
            "variant": "industrial",
            "size": {
              "w": 30,
              "h": 30
            },
            "attachments": [
              {
                "type": "label",
                "text": "TRIG"
              }
            ]
          }
        },
        {
          "id": "k_time",
          "bind": "timebase",
          "pos": {
            "x": 110,
            "y": 15
          },
          "presentation": {
            "container": "ctrl_sec",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 36,
              "h": 36
            },
            "attachments": [
              {
                "type": "label",
                "text": "TIME/DIV"
              }
            ]
          }
        },
        {
          "id": "k_volt",
          "bind": "gain",
          "pos": {
            "x": 170,
            "y": 15
          },
          "presentation": {
            "container": "ctrl_sec",
            "component": "knob",
            "variant": "white",
            "size": {
              "w": 36,
              "h": 36
            },
            "attachments": [
              {
                "type": "label",
                "text": "VOLT/DIV"
              }
            ]
          }
        },
        {
          "id": "k_offset",
          "bind": "offset",
          "pos": {
            "x": 110,
            "y": 75
          },
          "presentation": {
            "container": "ctrl_sec",
            "component": "knob",
            "variant": "default",
            "size": {
              "w": 36,
              "h": 36
            },
            "attachments": [
              {
                "type": "label",
                "text": "OFFSET"
              }
            ]
          }
        },
        {
          "id": "k_mode",
          "bind": "mode",
          "pos": {
            "x": 170,
            "y": 75
          },
          "presentation": {
            "container": "ctrl_sec",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 36,
              "h": 36
            },
            "attachments": [
              {
                "type": "label",
                "text": "MODE"
              }
            ]
          }
        }
      ]
    }
  },
  "test_parity": {
    "id": "test_parity",
    "name": "00-TEST-PARITY",
    "description": "Visual Parity Reference Manifest.",
    "metadata": {
      "name": "00-TEST-PARITY",
      "family": "utility",
      "version": "1.0.0",
      "rack": {
        "hp": 24,
        "units": "3U",
        "slot": "lower"
      }
    },
    "rack": {
      "slot": "lower",
      "hp": 24
    },
    "assets": {
      "source": false,
      "wasm": false
    },
    "artifact": null,
    "wasmUrl": null,
    "manifestUrl": "modules/test_parity/test_parity.acemm",
    "params": {},
    "ui": {
      "skin": "industrial",
      "dimensions": {
        "width": 360,
        "height": 420
      },
      "layout": {
        "containers": [
          {
            "id": "c_prim",
            "label": "PRIMITIVES",
            "pos": {
              "x": 10,
              "y": 10
            },
            "size": {
              "w": 340,
              "h": 120
            },
            "variant": "panel"
          },
          {
            "id": "c_att",
            "label": "ATTACHMENTS",
            "pos": {
              "x": 10,
              "y": 140
            },
            "size": {
              "w": 340,
              "h": 120
            },
            "variant": "section"
          }
        ]
      },
      "controls": [
        {
          "id": "k1",
          "bind": "k_main",
          "pos": {
            "x": 40,
            "y": 40
          },
          "presentation": {
            "component": "knob",
            "variant": "A_cyan",
            "container": "c_prim"
          }
        },
        {
          "id": "p1",
          "bind": "p_in",
          "pos": {
            "x": 100,
            "y": 40
          },
          "presentation": {
            "component": "port",
            "variant": "B_audio",
            "container": "c_prim"
          }
        },
        {
          "id": "k_att",
          "bind": "k_main",
          "pos": {
            "x": 40,
            "y": 40
          },
          "presentation": {
            "component": "knob",
            "variant": "B_white",
            "container": "c_att",
            "attachments": [
              {
                "type": "label",
                "text": "TOP",
                "position": "top"
              },
              {
                "type": "label",
                "text": "BOTTOM",
                "position": "bottom"
              }
            ]
          }
        }
      ]
    }
  },
  "vca": {
    "id": "vca",
    "name": "Omega VCA",
    "description": "",
    "metadata": {
      "name": "Omega VCA",
      "family": "utility",
      "version": "1.0.0",
      "rack": {
        "hp": 8,
        "units": "3U",
        "slot": "lower"
      }
    },
    "rack": {
      "slot": "lower",
      "hp": 8
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "0c3c1c71b684962c3e4aafda6ca79f193664a1d9e13b3e0024b400f23e92b7c5",
      "size": 2379
    },
    "wasmUrl": "modules/vca/vca.wasm",
    "manifestUrl": "modules/vca/vca.acemm",
    "params": {
      "level": {
        "label": "Level",
        "min": 0,
        "max": 1,
        "default": 0.8,
        "exponent": 2,
        "units": ""
      },
      "env_depth": {
        "label": "Env Depth",
        "min": 0,
        "max": 1,
        "default": 1,
        "exponent": 1,
        "units": ""
      },
      "curve": {
        "label": "Curve",
        "min": 0,
        "max": 1,
        "default": 0.5,
        "exponent": 1,
        "units": ""
      },
      "velocity": {
        "label": "Velocity",
        "min": 0,
        "max": 1,
        "default": 0,
        "exponent": 1,
        "units": ""
      }
    },
    "ui": {
      "dimensions": {
        "width": 120,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "main",
            "label": "VCA",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 110,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "knob_level",
          "bind": "level",
          "pos": {
            "x": 30,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "LVL"
              }
            ]
          }
        },
        {
          "id": "knob_curve",
          "bind": "curve",
          "pos": {
            "x": 60,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "CURVE"
              }
            ]
          }
        },
        {
          "id": "port_in",
          "bind": "in",
          "pos": {
            "x": 30,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "IN"
              }
            ]
          }
        },
        {
          "id": "port_gate",
          "bind": "gate_in",
          "pos": {
            "x": 90,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "GATE"
              }
            ]
          }
        },
        {
          "id": "port_out",
          "bind": "out",
          "pos": {
            "x": 60,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "OUT"
              }
            ]
          }
        },
        {
          "id": "k_env_depth",
          "bind": "env_depth",
          "pos": {
            "x": 30,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_velocity",
          "bind": "velocity",
          "pos": {
            "x": 30,
            "y": 140
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        }
      ]
    }
  },
  "vcf": {
    "id": "vcf",
    "name": "Omega VCF (ZDF Ladder)",
    "description": "",
    "metadata": {
      "name": "Omega VCF (ZDF Ladder)",
      "family": "filter",
      "version": "1.0.0",
      "rack": {
        "hp": 8,
        "units": "3U",
        "slot": "lower"
      }
    },
    "rack": {
      "slot": "lower",
      "hp": 8
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "1fef7cb3144a666b6a764562e3f4e821526ac3747136bc65b8e877e29ebe1744",
      "size": 5959
    },
    "wasmUrl": "modules/vcf/vcf.wasm",
    "manifestUrl": "modules/vcf/vcf.acemm",
    "params": {
      "cutoff": {
        "label": "Cutoff",
        "min": 20,
        "max": 20000,
        "default": 1000,
        "exponent": 3,
        "units": "hz"
      },
      "resonance": {
        "label": "Resonance",
        "min": 0,
        "max": 1,
        "default": 0.25,
        "exponent": 2,
        "units": ""
      },
      "mode": {
        "label": "Mode",
        "min": 0,
        "max": 3,
        "default": 0,
        "choices": [
          {
            "label": "LP",
            "value": 0
          },
          {
            "label": "HP",
            "value": 1
          },
          {
            "label": "BP",
            "value": 2
          },
          {
            "label": "Notch",
            "value": 3
          }
        ]
      },
      "keytrack": {
        "label": "Key Track",
        "min": 0,
        "max": 1,
        "default": 0.5,
        "exponent": 1,
        "units": ""
      },
      "cutoff_cv": {
        "label": "Cutoff CV",
        "min": 0,
        "max": 1,
        "default": 0.5,
        "exponent": 1,
        "units": ""
      },
      "res_cv": {
        "label": "Res CV",
        "min": 0,
        "max": 1,
        "default": 0,
        "exponent": 1,
        "units": ""
      }
    },
    "ui": {
      "dimensions": {
        "width": 120,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "main",
            "label": "VCF",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 110,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "knob_cutoff",
          "bind": "cutoff",
          "pos": {
            "x": 30,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "CUT"
              }
            ]
          }
        },
        {
          "id": "knob_res",
          "bind": "resonance",
          "pos": {
            "x": 60,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "RES"
              }
            ]
          }
        },
        {
          "id": "knob_mode",
          "bind": "mode",
          "pos": {
            "x": 90,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "MODE"
              }
            ]
          }
        },
        {
          "id": "port_in",
          "bind": "in",
          "pos": {
            "x": 30,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "IN"
              }
            ]
          }
        },
        {
          "id": "port_cutoff_cv",
          "bind": "cutoff_cv",
          "pos": {
            "x": 60,
            "y": 95
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "CV"
              }
            ]
          }
        },
        {
          "id": "port_res_cv",
          "bind": "res_cv",
          "pos": {
            "x": 90,
            "y": 95
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "RES"
              }
            ]
          }
        },
        {
          "id": "port_out",
          "bind": "out",
          "pos": {
            "x": 60,
            "y": 110
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "OUT"
              }
            ]
          }
        },
        {
          "id": "k_keytrack",
          "bind": "keytrack",
          "pos": {
            "x": 30,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_cutoff_cv",
          "bind": "cutoff_cv",
          "pos": {
            "x": 30,
            "y": 140
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_res_cv",
          "bind": "res_cv",
          "pos": {
            "x": 30,
            "y": 150
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        }
      ]
    }
  },
  "vco": {
    "id": "vco",
    "name": "Omega VCO (PolyBLEP)",
    "description": "",
    "metadata": {
      "name": "Omega VCO (PolyBLEP)",
      "family": "oscillator",
      "version": "1.0.0",
      "rack": {
        "hp": 8,
        "units": "3U",
        "slot": "lower"
      }
    },
    "rack": {
      "slot": "lower",
      "hp": 8
    },
    "assets": {
      "source": true,
      "wasm": true
    },
    "artifact": {
      "sha256": "34bae781982024548b5d01cdc4aa8f2b3f61716152360b1e931e006b014d203b",
      "size": 5718
    },
    "wasmUrl": "modules/vco/vco.wasm",
    "manifestUrl": "modules/vco/vco.acemm",
    "params": {
      "waveform": {
        "label": "Waveform",
        "min": 0,
        "max": 4,
        "default": 0,
        "choices": [
          {
            "label": "Sine",
            "value": 0
          },
          {
            "label": "Triangle",
            "value": 1
          },
          {
            "label": "Saw",
            "value": 2
          },
          {
            "label": "Square",
            "value": 3
          },
          {
            "label": "Pulse",
            "value": 4
          }
        ]
      },
      "coarse": {
        "label": "Coarse",
        "min": -12,
        "max": 12,
        "default": 0,
        "exponent": 1,
        "units": "st"
      },
      "fine": {
        "label": "Fine",
        "min": -100,
        "max": 100,
        "default": 0,
        "exponent": 1,
        "units": "ct"
      },
      "pulse_width": {
        "label": "Pulse Width",
        "min": 0.05,
        "max": 0.95,
        "default": 0.5,
        "exponent": 1,
        "units": "pw"
      },
      "fm_amount": {
        "label": "FM Amount",
        "min": 0,
        "max": 1,
        "default": 0,
        "exponent": 2,
        "units": ""
      },
      "pwm_amount": {
        "label": "PWM Amount",
        "min": 0,
        "max": 1,
        "default": 0,
        "exponent": 2,
        "units": ""
      },
      "sub_on": {
        "label": "Sub Osc",
        "min": 0,
        "max": 1,
        "default": 1,
        "choices": [
          {
            "label": "OFF",
            "value": 0
          },
          {
            "label": "ON",
            "value": 1
          }
        ]
      },
      "drift": {
        "label": "Drift",
        "min": 0,
        "max": 1,
        "default": 0.15,
        "exponent": 2,
        "units": ""
      }
    },
    "ui": {
      "dimensions": {
        "width": 120,
        "height": 140
      },
      "skin": "industrial",
      "layout": {
        "containers": [
          {
            "id": "main",
            "label": "VCO",
            "pos": {
              "x": 5,
              "y": 5
            },
            "size": {
              "w": 110,
              "h": 130
            },
            "variant": "panel"
          }
        ]
      },
      "controls": [
        {
          "id": "knob_waveform",
          "bind": "waveform",
          "pos": {
            "x": 30,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "WAVE"
              }
            ]
          }
        },
        {
          "id": "knob_coarse",
          "bind": "coarse",
          "pos": {
            "x": 60,
            "y": 15
          },
          "presentation": {
            "container": "main",
            "component": "knob",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "COARSE"
              }
            ]
          }
        },
        {
          "id": "port_v_oct",
          "bind": "v_oct",
          "pos": {
            "x": 30,
            "y": 95
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "V/OCT"
              }
            ]
          }
        },
        {
          "id": "port_fm",
          "bind": "fm",
          "pos": {
            "x": 60,
            "y": 95
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "FM"
              }
            ]
          }
        },
        {
          "id": "port_pwm",
          "bind": "pwm",
          "pos": {
            "x": 90,
            "y": 95
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "PWM"
              }
            ]
          }
        },
        {
          "id": "port_sync",
          "bind": "sync",
          "pos": {
            "x": 30,
            "y": 115
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "SYNC"
              }
            ]
          }
        },
        {
          "id": "port_out",
          "bind": "out",
          "pos": {
            "x": 60,
            "y": 115
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "OUT"
              }
            ]
          }
        },
        {
          "id": "port_sub_out",
          "bind": "sub_out",
          "pos": {
            "x": 90,
            "y": 115
          },
          "presentation": {
            "container": "main",
            "component": "port",
            "variant": "cyan",
            "size": {
              "w": 24,
              "h": 24
            },
            "attachments": [
              {
                "type": "label",
                "text": "SUB"
              }
            ]
          }
        },
        {
          "id": "k_fine",
          "bind": "fine",
          "pos": {
            "x": 30,
            "y": 130
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_pulse_width",
          "bind": "pulse_width",
          "pos": {
            "x": 30,
            "y": 140
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_fm_amount",
          "bind": "fm_amount",
          "pos": {
            "x": 30,
            "y": 150
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_pwm_amount",
          "bind": "pwm_amount",
          "pos": {
            "x": 30,
            "y": 160
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_sub_on",
          "bind": "sub_on",
          "pos": {
            "x": 30,
            "y": 170
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        },
        {
          "id": "k_drift",
          "bind": "drift",
          "pos": {
            "x": 30,
            "y": 180
          },
          "presentation": {
            "container": "main",
            "component": "hidden",
            "variant": "default"
          }
        }
      ]
    }
  }
};
