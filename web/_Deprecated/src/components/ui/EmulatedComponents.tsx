"use client";

/**
 * @purpose Renderiza una lista de componentes emulados para el editor de manifesto OMEGA, incluyendo sus iconos, nombres, taglines, características y descripciones detalladas en ambos inglés y español.
 * @purpose_en Renders a list of emulated components for the OMEGA manifest editor, including their icons, names, taglines, features, and detailed descriptions in both English and Spanish.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:g0x40a
 * @lastUpdated 2026-06-15T10:51:40.343Z
 */


import React, { useState } from "react";
import { 
  Activity, 
  Cpu, 
  Radio, 
  Flame, 
  Disc, 
  Volume2, 
  FileAudio,
  Maximize2
} from "lucide-react";
import { GlassPanel } from "./GlassPanel";

interface ComponentDetail {
  id: string;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  features: string[];
  detailsEn: string;
  detailsEs: string;
}

const emulatedComponentsList: ComponentDetail[] = [
  {
    id: "dco",
    name: "DCO (Digitally Controlled Oscillator)",
    icon: <Cpu className="w-5 h-5" />,
    tagline: "El motor digital con alma analógica",
    features: [
      "Reloj divisor Intel 8253",
      "Curvatura de carga no lineal",
      "Discharge Blip en graves",
      "Sub-Oscilador PolyBLEP"
    ],
    detailsEn: "Faithful emulation of the Intel 8253 digital divisor clock. It features hardware-accurate Charge Curvature (the sawtooth ramp bends slightly due to output impedance) and 'Discharge Blips' (capacitor discharge rebound) giving it a signature low-end punch. The Sub-Oscillator is smoothed via 4th-order PolyBLEP and a 4.2 kHz passive RC filter.",
    detailsEs: "Emulación fiel del reloj divisor digital Intel 8253. Cuenta con curvatura de carga no lineal del hardware real (la rampa de diente de sierra se deforma sutilmente por la impedancia de salida) y el 'Discharge Blip' (rebote de descarga del condensador) que le da su pegada característica en graves. El Sub-oscilador está suavizado con PolyBLEP de 4º orden y un filtro pasivo RC a 4.2 kHz."
  },
  {
    id: "vcf",
    name: "VCF (Voltage Controlled Filter)",
    icon: <Flame className="w-5 h-5" />,
    tagline: "El corazón rugiente del chip IR3109",
    features: [
      "ZDF TPT de 4 polos",
      "Resolvedor Newton-Raphson",
      "Compensación de graves Q",
      "Auto-oscilación térmica"
    ],
    detailsEn: "A 4-pole cascade Zero-Delay Feedback (ZDF) Trapezoidal Parameter-Integrating (TPT) filter replicating the original Roland IR3109 chip. Uses an iterative Newton-Raphson solver to compute non-linear OTA saturation. Includes Input Q-Compensation to prevent low-end loss at high resonance, and injects adaptive thermal noise to spark natural auto-oscillation.",
    detailsEs: "Filtro pasabajo resonante ZDF (Zero-Delay Feedback) TPT (Trapezoidal Parameter-Integrating) de 4 polos en cascada que emula el chip Roland IR3109. Implementa un resolvedor interactivo de Newton-Raphson para calcular la saturación física no lineal de los OTAs. Incluye compensación Q de entrada para evitar la pérdida de graves al resonar e inyecta ruido térmico adaptativo para coger auto-oscilación orgánica."
  },
  {
    id: "hpf",
    name: "HPF (High Pass Filter)",
    icon: <Maximize2 className="w-5 h-5" />,
    tagline: "El legendario circuito de 4 posiciones",
    features: [
      "Biquad Active Bass Boost (+10.5 dB)",
      "Posición 1: Flat lineal",
      "Posición 2: Corte a 236 Hz",
      "Posición 3: Corte a 754 Hz"
    ],
    detailsEn: "A 4-step high-pass filter. Position 0 activates the proprietary Active Bass Boost (an active 2-pole, 2-zero low-shelf biquad filter boosting +10.5 dB at 59 Hz). Positions 1, 2, and 3 provide Flat (no filter), 236 Hz (0.015uF capacitor), and 754 Hz (0.0047uF capacitor) cuts.",
    detailsEs: "Filtro pasaltos de 4 posiciones. La posición 0 activa el icónico Bass Boost Activo (un filtro biquad activo de 2 polos y 2 ceros con realce de +10.5 dB a 59 Hz). Las posiciones 1, 2 y 3 proporcionan cortes plano (sin filtro), 236 Hz (condensador de 0.015uF) y 754 Hz (condensador de 0.0047uF) respectivamente."
  },
  {
    id: "adsr",
    name: "ADSR Envelopes",
    icon: <Activity className="w-5 h-5" />,
    tagline: "Microcontrolador digital en tiempo real",
    features: [
      "Frecuencia de ticks a 234.2 Hz",
      "Truncamiento CalcDecay original",
      "8% Overshoot de transistores",
      "Interpolación lineal per-sample"
    ],
    detailsEn: "Emulates the original digital uPD7811G MCU operating at ~234.2 Hz (4.23ms ticks). It implements the exact 'CalcDecay' 8-bit truncated multiplication arithmetic which discards the lowest cross-product, accelerating decay times by 6% like the real hardware. Attack phase features an 8% transistor-style overshoot for snappy envelopes.",
    detailsEs: "Emula el comportamiento del microcontrolador uPD7811G original corriendo a ticks de ~234.2 Hz (periodo de 4.23ms). Implementa la multiplicación truncada de 8 bits 'CalcDecay' original que descarta el producto inferior acelerando el decaimiento un 6% real. La etapa de ataque cuenta con un overshoot del 8% de transistores para lograr pegada inmediata."
  },
  {
    id: "vca",
    name: "VCA (Voltage Controlled Amplifier)",
    icon: <Volume2 className="w-5 h-5" />,
    tagline: "Saturación orgánica y caída de tensión",
    features: [
      "Curva medida de chips Boaris",
      "Fuga analógica constante",
      "Slew analógico CV (687 us)",
      "Simulación de Power Sag"
    ],
    detailsEn: "Dual VCA control modes (Env / Gate). Features the exponential transfer curve mapped from hardware measurements of clone Boaris chips (kVCATableHW), dropping sharply below 10% to cut long decays rhythmically. Simulates passive RC CV slew (687 us) and power supply voltage sag when stacking voices.",
    detailsEs: "Modo de control dual (Envolvente o Gate). Incorpora la curva de transferencia exponencial medida directamente de chips clones Boaris reales (kVCATableHW), cayendo bruscamente por debajo del 10% para cortes secos y rítmicos. Emula el slew analógico del voltaje de control de 687 us y la caída de tensión (Power Sag) de la fuente al acumular voces."
  },
  {
    id: "lfo",
    name: "LFO (Low Frequency Oscillator)",
    icon: <Disc className="w-5 h-5" />,
    tagline: "El modulador maestro unificado",
    features: [
      "Monofónico para todo el sintetizador",
      "Velocidad cuantizada por ROM",
      "Delay de 2 etapas (Holdoff & Ramp)",
      "Redondeo de pico cúbico"
    ],
    detailsEn: "A global monophonic LFO. Replicates the original uPD7811G firmware ROM speed quantization table (128 discrete steps). Features a two-stage digital delay envelope (silent Holdoff phase followed by a linear Ramp fade-in) and cubic rounding of waveform peaks.",
    detailsEs: "Oscilador de baja frecuencia monofónico global. Recrea la tabla de cuantización de velocidad de 128 pasos de la ROM del uPD7811G original. Cuenta con envolvente de delay de dos etapas (fase silenciosa Holdoff y rampa lineal de entrada Fade-in) y redondeo cúbico de picos de onda."
  },
  {
    id: "chorus",
    name: "Chorus BBD (Bucket-Brigade Delay)",
    icon: <Radio className="w-5 h-5" />,
    tagline: "El mítico ensanchador estéreo",
    features: [
      "Chips MN3009 y MN3101",
      "Ruido de fondo analógico (Hiss)",
      "Pérdidas de eficiencia CTE",
      "Resonancia de retorno ClickRing"
    ],
    detailsEn: "Authentic dual-mode BBD chorus. Features MN3009 line delays with active pre/post 9.6 kHz Butterworth filters, MN3101 clock transients (BBDClick), and local PCB resonance (ClickRing at 30 Hz). Emulates Charge Transfer Efficiency (CTE) losses that modulate dry/wet gain at low clock rates, alongside authentic background analog hiss.",
    detailsEs: "Chorus BBD analógico de modo dual. Incorpora líneas de retardo MN3009 con filtros biquad Butterworth activos a 9.6 kHz, transitorios de reloj del driver MN3101 (BBDClick) y la resonancia local de placa (ClickRing a 30 Hz). Emula la pérdida de transferencia de carga (CTE Loss) que varía la ganancia en graves y el siseo analógico de fondo."
  },
  {
    id: "connectivity",
    name: "Fidelidad y Conectividad",
    icon: <FileAudio className="w-5 h-5" />,
    tagline: "Integración física y restauración digital",
    features: [
      "SysEx bidireccional completo",
      "Respaldo por cinta FSK",
      "128 Presets de fábrica bit-a-bit",
      "Teclado virtual QWERTY"
    ],
    detailsEn: "Bidirectional SysEx integration for real-time parameter changes (IPR) and library dumps (APR). Features cassette tape storage emulation (FSK wave encoding/decoding), full 128 factory bank recovery, QWERTY playback keyboard, configurable oversampling (1x-4x), and expandable 6-to-16 voice polyphony.",
    detailsEs: "Integración SysEx bidireccional para cambios en vivo (IPR) y volcados de librería (APR). Incluye emulación de almacenamiento de datos por cinta (codificador/decodificador de audio FSK), restauración completa del banco de 128 presets, teclado interactivo QWERTY, sobremuestreo configurable (1x-4x) y polifonía expandible a 16 voces."
  }
];

export function EmulatedComponents({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState("dco");

  const activeComp = emulatedComponentsList.find(c => c.id === activeTab) || emulatedComponentsList[0];

  return (
    <div className="pt-16 space-y-8">
      <div className="space-y-4">
        <h2 className="font-headline text-3xl font-black italic uppercase leading-none tracking-tighter">
          Ingeniería de Emulación <span className="text-primary">Componente a Componente</span>
        </h2>
        <p className="text-zinc-400 font-body text-base max-w-3xl leading-relaxed">
          No nos limitamos a aproximar el comportamiento general del sintetizador. Hemos reconstruido y simulado las inercias de la circuitería analógica original y las limitaciones digitales de su microcontrolador de 1984.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Component Tabs List (Left Side) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 h-fit">
          {emulatedComponentsList.map((comp) => {
            const isActive = activeTab === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => setActiveTab(comp.id)}
                className={`text-left p-4 rounded-sm border transition-all duration-300 flex items-center gap-4 group ${
                  isActive 
                    ? "bg-primary/10 border-primary/50 text-white" 
                    : "bg-white/[0.01] hover:bg-white/[0.03] border-white/5 text-zinc-400"
                }`}
              >
                <div className={`p-2 rounded-sm transition-colors ${isActive ? "bg-primary text-white" : "bg-white/5 text-zinc-500 group-hover:text-zinc-300"}`}>
                  {comp.icon}
                </div>
                <div>
                  <span className="font-headline text-xs font-bold uppercase tracking-wider block">
                    {comp.name.split(" (")[0]}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-body block mt-0.5 line-clamp-1">
                    {comp.tagline}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Component Showcase Card (Right Side) */}
        <div className="lg:col-span-7">
          <GlassPanel className="p-8 border-primary/10 bg-white/[0.01] h-full flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 text-primary rounded-sm">
                  {activeComp.icon}
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-black italic uppercase leading-none text-white">
                    {activeComp.name}
                  </h3>
                  <span className="text-xs text-primary font-headline font-bold uppercase tracking-widest mt-1 block">
                    {activeComp.tagline}
                  </span>
                </div>
              </div>

              <p className="text-zinc-300 font-body text-sm leading-relaxed">
                {locale === "es" ? activeComp.detailsEs : activeComp.detailsEn}
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-zinc-500 block">
                {locale === "es" ? "Características Clave Emuladas" : "Key Emulated Features"}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeComp.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/[0.02] p-3 border border-white/5 rounded-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-headline font-bold uppercase tracking-wider text-zinc-400">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
