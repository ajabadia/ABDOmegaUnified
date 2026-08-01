/**
 * @purpose Gestiona parámetros y categorías de edición del manifest OMEGA.
 * @purpose_en Manages calibration parameters and categories for the OMEGA manifest editor.
 * @refactorable true (contains multiple related but distinct data structures and configurations)
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:5,imports:0,sig:1cx9rvw
 * @lastUpdated 2026-06-15T10:52:32.603Z
 */

export interface CalibrationParameter {
  id: string;
  name: string;
  description: string;
  defaultValue: string;
  range: string;
  step?: string;
}

export interface CalibrationCategory {
  title: string;
  description: string;
  parameters: CalibrationParameter[];
}

export const calibrationCategories: CalibrationCategory[] = [
  {
    title: "GENERAL",
    description: "Configuración global de control de voz, comportamiento físico de sustain y afinación maestra del sintetizador.",
    parameters: [
      { id: "midiChannel", name: "Global MIDI Channel", description: "Canal de entrada MIDI global (0 = OMNI/Todos).", defaultValue: "1", range: "0 / 16", step: "1.0" },
      { id: "numVoices", name: "Maximum Polyphony", description: "Número máximo de voces de polifonía simultánea.", defaultValue: "16", range: "1 / 16", step: "1.0" },
      { id: "benderRange", name: "Bender Pitch Range", description: "Rango máximo de la palanca de pitch bend en semitonos.", defaultValue: "2", range: "1 / 12", step: "1.0" },
      { id: "velocitySens", name: "Velocity Sensitivity", description: "Multiplicador de la influencia de la velocidad de pulsación.", defaultValue: "0.50", range: "0.00 / 1.00", step: "0.01" },
      { id: "aftertouchToVCF", name: "Aftertouch to VCF", description: "Sensibilidad del filtro VCF a la presión del teclado.", defaultValue: "0.50", range: "0.00 / 1.00", step: "0.01" },
      { id: "lcdBrightness", name: "LCD Brightness", description: "Intensidad de la retroiluminación del visor de pantalla.", defaultValue: "0.80", range: "0.00 / 1.00", step: "0.10" },
      { id: "sustainPedalInvert", name: "Invert Sustain", description: "Invierte la polaridad física del pedal de sustain.", defaultValue: "0 (Normal)", range: "0 / 1", step: "1.0" },
      { id: "masterOutputGain", name: "Master Output Gain", description: "Ajuste fino de ganancia de salida global en decibelios (dB).", defaultValue: "0.0 dB", range: "-12.0 dB / 12.0 dB", step: "0.1" },
      { id: "masterPitchCents", name: "Master Pitch Offset", description: "Afinación maestra global en cents de semitono.", defaultValue: "0.0", range: "-100.0 / 100.0", step: "0.1" },
      { id: "midiFunction", name: "MIDI SysEx Mode", description: "Nivel de transmisión MIDI (I=Notas, II=Patch, III=SysEx).", defaultValue: "1", range: "0 / 2", step: "1.0" },
      { id: "unisonWidth", name: "Unison Stereo Width", description: "Separación estéreo de las voces en modo Unísono.", defaultValue: "1.00", range: "0.00 / 1.00", step: "0.01" },
      { id: "unisonDetune", name: "Unison Detune Amt", description: "Desafinación de micro-tono en modo Unísono.", defaultValue: "0.35", range: "0.00 / 1.00", step: "0.01" },
      { id: "sustainMode", name: "Sustain Pedal Mode", description: "Comportamiento del pedal (0=Normal, 1=Sostenido/SOS, 2=Interruptor).", defaultValue: "0", range: "0 / 2", step: "1.0" },
      { id: "enableLogging", name: "System Logging", description: "Activa/Desactiva los logs de diagnóstico en consola.", defaultValue: "0 (Desactivado)", range: "0 / 1", step: "1.0" }
    ]
  },
  {
    title: "DCO",
    description: "Oscilador Controlado Digitalmente. Calibraciones de ancho de pulso, ganancia y saturación de mezcla, así como atenuaciones de faders.",
    parameters: [
      { id: "dcoMixerGain", name: "DCO Mixer Gain", description: "Ganancia de mezcla antes de saturación de etapa DCO.", defaultValue: "0.70", range: "0.10 / 1.50", step: "0.05" },
      { id: "subGainScale", name: "Sub-Osc Gain Scale", description: "Multiplicador de escala global para el volumen del Sub-oscilador.", defaultValue: "1.25", range: "0.50 / 2.00", step: "0.05" },
      { id: "noiseGainScale", name: "Noise Gain Scale", description: "Multiplicador de escala global para el ruido blanco del DCO.", defaultValue: "0.45", range: "0.10 / 1.50", step: "0.01" },
      { id: "masterClockHz", name: "Oscillator Master Clock", description: "Frecuencia del reloj del divisor digital Intel 8253 (Hz).", defaultValue: "8000000 Hz", range: "7000000 Hz / 9000000 Hz", step: "1.0" },
      { id: "mixerSaturation", name: "DCO Mixer Clipping", description: "Umbral a partir del cual satura la mezcla de DCOs en VCF.", defaultValue: "0.60", range: "0.10 / 4.00", step: "0.05" },
      { id: "noiseGain", name: "Noise Level Trim", description: "Trim base de volumen del ruido respecto a los DCOs.", defaultValue: "1.00", range: "0.10 / 2.00", step: "0.05" },
      { id: "pwmCenterDuty", name: "PWM Center Duty", description: "Calibración del ancho del pulso al 50% (centro).", defaultValue: "0.50", range: "0.40 / 0.60", step: "0.01" },
      { id: "pwmMaxDuty", name: "PWM Maximum Duty", description: "Límite superior del ancho del pulso (por defecto 95%).", defaultValue: "0.95", range: "0.90 / 0.99", step: "0.01" },
      { id: "pwmMinDuty", name: "PWM Minimum Duty", description: "Límite inferior del ancho del pulso (por defecto 5%).", defaultValue: "0.05", range: "0.01 / 0.10", step: "0.01" },
      { id: "pwmOffset", name: "PWM Tuning Offset", description: "Desviación fija del centro de modulación de ancho de pulso.", defaultValue: "0.0", range: "-10.0 / 10.0", step: "0.5" },
      { id: "sawMixAmp", name: "Saw Wave Mix Level", description: "Amplitud nominal de la onda sierra (Juno-106 hardware = 0.6).", defaultValue: "0.60", range: "0.10 / 2.00", step: "0.05" },
      { id: "pulseMixAmp", name: "Pulse Wave Mix Level", description: "Amplitud nominal de la onda cuadrada (Juno-106 hardware = 0.5).", defaultValue: "0.50", range: "0.10 / 2.00", step: "0.05" },
      { id: "subMixAmp", name: "Sub-Osc Mix Level", description: "Amplitud nominal del sub-oscilador (Juno-106 hardware = 0.75).", defaultValue: "0.75", range: "0.10 / 2.00", step: "0.05" },
      { id: "noiseMixAmp", name: "Noise Mix Level", description: "Amplitud nominal del generador de ruido (Juno-106 hardware = 1.2).", defaultValue: "1.20", range: "0.10 / 3.00", step: "0.05" },
      { id: "audioTaperScale", name: "Audio Taper Scale", description: "Pendiente exponencial de los controles (fórmula del hardware, k=3).", defaultValue: "3.0", range: "1.0 / 6.0", step: "0.1" },
      { id: "dcoLfoShuntK", name: "DCO-LFO Shunt Factor", description: "Factor de atenuación física del slider del LFO (J106 = 5.0).", defaultValue: "5.0", range: "1.0 / 10.0", step: "0.5" },
      { id: "dcoLfoMaxSemitones", name: "DCO-LFO Max Depth", description: "Profundidad de tono a máximo slider LFO (J106 = ±4 semitonos).", defaultValue: "4.0", range: "1.0 / 12.0", step: "0.5" },
      { id: "oscSwitchRampMs", name: "Osc Switch Ramp Time", description: "Tiempo de desvanecimiento al encender/apagar ondas (1.45 ms).", defaultValue: "1.45 ms", range: "0.1 ms / 10.0 ms", step: "0.1" },
      { id: "dcoSawCurvature", name: "DCO Saw Curvature", description: "Curva de carga capacitiva no lineal del diente de sierra.", defaultValue: "0.15", range: "0.00 / 0.50", step: "0.01" },
      { id: "dcoLfoPitchDepth", name: "DCO Vibrato Depth", description: "Escala de sensibilidad del vibrato de tono del LFO maestro.", defaultValue: "0.40", range: "0.10 / 1.00", step: "0.05" },
      { id: "pwmOffThreshold", name: "PWM Cut-off", description: "Punto de ciclo donde el pulso se apaga/silencia por completo.", defaultValue: "0.05", range: "0.00 / 0.15", step: "0.01" },
      { id: "pwmSlewRateManual", name: "PWM Manual Slew", description: "Inercia de control para cambios manuales en el control PWM.", defaultValue: "0.05", range: "0.005 / 0.200", step: "0.005" },
      { id: "pwmSlewRateLFO", name: "PWM LFO Slew", description: "Inercia de filtrado para modulación PWM por LFO.", defaultValue: "0.10", range: "0.01 / 0.50", step: "0.01" }
    ]
  },
  {
    title: "VCA",
    description: "Amplificador Controlado por Voltaje. Ganancias, fugas analógicas inherentes, caídas de tensión (sag) y emulaciones de curvas Boaris.",
    parameters: [
      { id: "vcaMasterGain", name: "VCA Master Gain", description: "Ganancia maestra del VCA por cada voz física.", defaultValue: "1.00", range: "0.10 / 3.00", step: "0.05" },
      { id: "vcaBleed", name: "VCA Bleed Level", description: "Fuga analógica constante del oscilador con el VCA cerrado (dB).", defaultValue: "-85.0 dB", range: "-100.0 dB / -60.0 dB", step: "0.5" },
      { id: "vcaVelSensScale", name: "VCA Velocity Scale", description: "Multiplicador de influencia de la velocidad del teclado en VCA.", defaultValue: "1.00", range: "0.00 / 2.00", step: "0.10" },
      { id: "vcaSagAmt", name: "VCA Power Sag", description: "Simulación de caída de tensión en cascada al apilar voces.", defaultValue: "0.025", range: "0.000 / 0.100", step: "0.005" },
      { id: "vcaKillThreshold", name: "Voice Kill Threshold", description: "Umbral por debajo del cual la voz se corta y libera (ahorro CPU).", defaultValue: "0.004", range: "0.001 / 0.020", step: "0.001" },
      { id: "vcaDcOffset", name: "DC Offset Correction", description: "Desbalance DC del VCA (causa clics analógicos sutiles).", defaultValue: "0.00", range: "-0.01 / 0.01", step: "0.0001" },
      { id: "vcaOffset", name: "VCA Bias Offset", description: "Desviación de reposo VCA (voltaje de offset del transistor).", defaultValue: "0.00", range: "-0.05 / 0.05", step: "0.005" },
      { id: "vcaSlewMs", name: "VCA Analog Slew", description: "Slew analógico RC pasivo del CV del VCA (J106 = 0.687ms).", defaultValue: "0.687 ms", range: "0.0 ms / 20.0 ms", step: "0.1" },
      { id: "vcaCurveType", name: "VCA Curve Model", description: "Tipo de convertidor: 0=Boaris (Medido J106), 1=J60 Shockley, 2=Lineal.", defaultValue: "0", range: "0 / 2", step: "1.0" }
    ]
  },
  {
    title: "ADSR",
    description: "Generador de Envolventes ADSR. Resolución digital del DAC simulado uPD7811G, overshoot de transistores y suavizado.",
    parameters: [
      { id: "adsrSlewMs", name: "ADSR Output Smoothing", description: "Slew para pulir los saltos discretos del DAC y evitar clics.", defaultValue: "1.50 ms", range: "0.10 ms / 10.00 ms", step: "0.1" },
      { id: "adsrAttackFactor", name: "ADSR Attack Factor", description: "Parámetro de curvatura del tiempo de ataque.", defaultValue: "0.35", range: "0.10 / 1.00", step: "0.01" },
      { id: "adsrMcuRate", name: "Env MCU Speed", description: "Periodo de refresco de la CPU emulada (J106 uPD7811G = ~4.23ms).", defaultValue: "4.2335 ms", range: "0.50 ms / 10.00 ms", step: "0.0001" },
      { id: "adsrDacSteps", name: "Env DAC Resolution", description: "Número de pasos de cuantización DAC de envolvente (escalera R-2R).", defaultValue: "1024", range: "16 / 16384", step: "1.0" },
      { id: "adsrOvershoot", name: "Attack Overshoot", description: "Pico residual al final del ataque en transistores (~8%).", defaultValue: "1.08", range: "1.00 / 1.25", step: "0.01" },
      { id: "adsrCurveExponent", name: "ADSR Curve Exponent", description: "Curva de escala de los potenciómetros (Lineal a Exponencial).", defaultValue: "2.2", range: "1.0 / 4.0", step: "0.1" }
    ]
  },
  {
    title: "CHORUS",
    description: "Chorus Analógico de Retardo de Línea BBD. Tasas de modulación, saturación BBD, nivel e histéresis del siseo analógico.",
    parameters: [
      { id: "chorusMix", name: "Chorus Dry/Wet Mix", description: "Mezcla entre el canal directo limpio y el BBD mojado.", defaultValue: "1.00", range: "0.00 / 1.00", step: "0.01" },
      { id: "chorusHiss", name: "Analog Hiss Level", description: "Nivel de ruido de fondo de las líneas BBD (dB).", defaultValue: "-68.0 dB", range: "-96.0 dB / -30.0 dB", step: "0.5" },
      { id: "chorusDelayI", name: "Chorus I Base Delay", description: "Retraso central en ms del modo Chorus I (J106 = 3.3ms).", defaultValue: "3.3 ms", range: "1.0 ms / 10.0 ms", step: "0.1" },
      { id: "chorusDelayII", name: "Chorus II Base Delay", description: "Retraso central en ms del modo Chorus II (J106 = 3.3ms).", defaultValue: "3.3 ms", range: "2.0 ms / 20.0 ms", step: "0.1" },
      { id: "chorusGainDry", name: "Chorus Dry Gain (IC6)", description: "Ganancia del bus dry en el sumador inversor IC6 (Default 0.863).", defaultValue: "0.863", range: "0.500 / 1.500", step: "0.001" },
      { id: "chorusGainWet", name: "Chorus Wet Gain (IC6)", description: "Ganancia del bus wet en el sumador inversor IC6 (Default 1.257).", defaultValue: "1.257", range: "0.500 / 2.000", step: "0.001" },
      { id: "chorusLfoRate", name: "Chorus I Frequency", description: "LFO de modulación del Chorus I (Juno hardware = 0.513 Hz).", defaultValue: "0.513 Hz", range: "0.100 Hz / 2.000 Hz", step: "0.01" },
      { id: "chorusLfoRateII", name: "Chorus II Frequency", description: "LFO de modulación del Chorus II (Juno hardware = 0.78 Hz).", defaultValue: "0.780 Hz", range: "0.100 Hz / 2.000 Hz", step: "0.01" },
      { id: "chorusBothRate", name: "Chorus I+II Frequency", description: "LFO rápido al activar ambos interruptores I+II (7.7 Hz).", defaultValue: "7.70 Hz", range: "1.00 Hz / 15.00 Hz", step: "0.1" },
      { id: "chorusModDepth", name: "Chorus Mod Depth", description: "Desplazamiento máximo (swing) de modulación en milisegundos.", defaultValue: "1.50 ms", range: "0.10 ms / 5.00 ms", step: "0.1" },
      { id: "chorusSatBoost", name: "Chorus Saturation", description: "Nivel de distorsión analógica armónica en el chip BBD.", defaultValue: "1.20", range: "0.50 / 2.00", step: "0.05" },
      { id: "chorusFilterCutoff", name: "Chorus Filter Cutoff", description: "Corte del filtro pasabajos de reconstrucción post-BBD (Hz).", defaultValue: "9661 Hz", range: "2000 Hz / 15000 Hz", step: "100.0" },
      { id: "chorusHissColor", name: "Hiss Filter Color", description: "Timbre espectral del ruido (Pink a White).", defaultValue: "0.40", range: "0.05 / 1.00", step: "0.05" }
    ]
  },
  {
    title: "LFO",
    description: "Oscilador de Baja Frecuencia. Límites del rate, holdoff delay, acumulador interno y resolución en pasos discretos.",
    parameters: [
      { id: "lfoMaxRate", name: "LFO Max Frequency", description: "Velocidad a slider 10.", defaultValue: "30.0 Hz", range: "1.0 Hz / 100.0 Hz", step: "0.5" },
      { id: "lfoMinRate", name: "LFO Min Frequency", description: "Velocidad a slider 0.", defaultValue: "0.10 Hz", range: "0.01 Hz / 5.00 Hz", step: "0.05" },
      { id: "lfoDelayMax", name: "LFO Max DelayTime", description: "Retraso (holdoff) máximo en segundos a slider 10.", defaultValue: "3.0 s", range: "0.1 s / 10.0 s", step: "0.1" },
      { id: "lfoResolution", name: "LFO DAC Steps", description: "Cuantización digital de los escalones LFO (7.5 = 4 bits).", defaultValue: "7.5", range: "1.0 / 128.0", step: "0.5" },
      { id: "lfoTickRateMs", name: "LFO MCU Tick Period", description: "Periodo de refresco LFO en la CPU de control (factory 4.23ms).", defaultValue: "4.2335 ms", range: "1.00 ms / 10.00 ms", step: "0.001" },
      { id: "lfoAccumMax", name: "LFO Accumulator Max", description: "Límite del acumulador interno (firmware original = 8191).", defaultValue: "8191", range: "4095 / 16383", step: "1.0" },
      { id: "lfoHoldoffThresh", name: "LFO Holdoff Threshold", description: "Umbral de ticks del delay holdoff (firmware original = 16384).", defaultValue: "16384", range: "4096 / 32767", step: "1.0" }
    ]
  },
  {
    title: "VCF",
    description: "Filtro Controlado por Voltaje IR3109 / BA662. Auto-oscilación, compensación de graves en resonancias altas, tracking y tolerancias.",
    parameters: [
      { id: "vcfMinHz", name: "VCF Min Frequency", description: "Límite de frecuencia mínima del filtro.", defaultValue: "10.0 Hz", range: "5.0 Hz / 100.0 Hz", step: "1.0" },
      { id: "vcfMaxHz", name: "VCF Max Frequency", description: "Límite de frecuencia máxima del filtro.", defaultValue: "18000 Hz", range: "5000 Hz / 22000 Hz", step: "100.0" },
      { id: "vcfSelfOscThreshold", name: "VCF Self-Osc Point", description: "Nivel de resonancia donde el filtro empieza a auto-oscilar.", defaultValue: "0.95", range: "0.85 / 1.00", step: "0.01" },
      { id: "vcfSaturation", name: "VCF OTA Saturation", description: "Escala de saturación no lineal en etapas de realimentación OTA.", defaultValue: "1.20", range: "0.10 / 4.00", step: "0.05" },
      { id: "vcfResoComp", name: "VCF Resonance Comp", description: "Compensación de graves a alta resonancia (BA662).", defaultValue: "0.35", range: "0.00 / 1.50", step: "0.05" },
      { id: "vcfResoCompBoost", name: "Reso Comp Global Boost", description: "Multiplicador de resonancia adicional (útil para órganos).", defaultValue: "1.50", range: "1.00 / 3.00", step: "0.10" },
      { id: "vcfLfoDepth", name: "LFO Filter Depth", description: "Rango de influencia del LFO en el VCF.", defaultValue: "0.30", range: "0.05 / 1.00", step: "0.05" },
      { id: "vcfEnvRange", name: "Env Filter Range", description: "Rango máximo de influencia de la envolvente ADSR en el VCF.", defaultValue: "2.00", range: "0.50 / 4.00", step: "0.10" },
      { id: "vcfSelfOscInt", name: "Self-Osc Intensity", description: "Amplitud de pico en la realimentación auto-oscilante.", defaultValue: "0.50", range: "0.10 / 2.00", step: "0.05" },
      { id: "vcfTrackCenter", name: "VCF Tracking Center", description: "Nota pivote donde el tracking de teclado es exactamente 1:1.", defaultValue: "440.0 Hz", range: "100.0 Hz / 1000.0 Hz", step: "10.0" },
      { id: "vcfResoSpread", name: "VCF Resonance Spread", description: "Varianza de fábrica del filtro IR3109 por voz.", defaultValue: "0.05", range: "0.00 / 0.20", step: "0.01" },
      { id: "vcfWidth", name: "VCF Tracking Width", description: "Factor V/Oct (calibración del trimpot físico).", defaultValue: "1.00", range: "0.80 / 1.20", step: "0.01" },
      { id: "vcfSlewMs", name: "VCF Analog Slew", description: "Slew analógico RC pasivo del CV del VCF (J106 = 0.522ms).", defaultValue: "0.522 ms", range: "0.0 ms / 20.0 ms", step: "0.1" },
      { id: "vcfResPolK", name: "VCF Res Polynomial K", description: "Coeficiente polinómico del feedback resonante ResK.", defaultValue: "1.24", range: "0.50 / 2.00", step: "0.01" },
      { id: "vcfFbScale", name: "VCF BA662 Feedback", description: "Factor de escala de feedback para par diferencial BA662.", defaultValue: "4.20", range: "1.00 / 10.00", step: "0.05" }
    ]
  },
  {
    title: "HPF",
    description: "Filtro Pasaltos de 4 Pasos. Frecuencias de condensadores físicos, realce de graves e inercias de circuitos legados.",
    parameters: [
      { id: "hpfFreq2", name: "HPF Pos 2 Frequency", description: "Frecuencia de corte física en posición 2 (condensador 0.015uF).", defaultValue: "236.0 Hz", range: "50.0 Hz / 1000.0 Hz", step: "1.0" },
      { id: "hpfFreq3", name: "HPF Pos 3 Frequency", description: "Frecuencia de corte física en posición 3 (condensador 0.0047uF).", defaultValue: "754.0 Hz", range: "300.0 Hz / 2500.0 Hz", step: "5.0" },
      { id: "hpfBassBoostGain", name: "Bass Boost Scale", description: "Multiplicador del realce de bajos en posición 0 (+10.5 dB a 59Hz).", defaultValue: "1.00", range: "0.10 / 3.00", step: "0.05" },
      { id: "hpfShelfFreq", name: "HPF Pos 0 Shelf Freq", description: "[Legado] No utilizado por el nuevo biquad. UI compatibilidad.", defaultValue: "70.0 Hz", range: "20.0 Hz / 300.0 Hz", step: "1.0" },
      { id: "hpfShelfGain", name: "HPF Pos 0 Shelf Gain", description: "[Legado] No utilizado por el nuevo biquad. UI compatibilidad.", defaultValue: "3.0 dB", range: "0.0 dB / 12.0 dB", step: "0.1" },
      { id: "hpfQ", name: "HPF Filter Q", description: "[Legado] No utilizado por el nuevo 1-pole TPT. UI.", defaultValue: "0.707", range: "0.100 / 2.000", step: "0.01" }
    ]
  },
  {
    title: "THERMAL",
    description: "Simulación de deriva térmica aleatoria (Random Walk) por calentamiento físico de los transistores del sintetizador.",
    parameters: [
      { id: "thermalIntensity", name: "Thermal Intensity", description: "Ganancia para el ruido térmico físico de fluctuación de tono.", defaultValue: "1.50", range: "0.10 / 3.00", step: "0.10" },
      { id: "thermalDrift", name: "Global Thermal", description: "Amplitud general del desvío térmico del sintetizador.", defaultValue: "100.0", range: "0.0 / 200.0", step: "1.0" },
      { id: "thermalInertia", name: "Thermal Inertia", description: "Muestras de retardo entre actualizaciones del random walk.", defaultValue: "1024", range: "64 / 8192", step: "64.0" },
      { id: "thermalMigration", name: "Thermal Migration", description: "Velocidad de deriva aleatoria con el calentamiento (paso walk).", defaultValue: "0.0005", range: "0.0001 / 0.0100", step: "0.0001" },
      { id: "driftWalkIntensity", name: "Drift Walk Intensity", description: "Amplitud máxima en cents de la inestabilidad (J106 = ±3 cents).", defaultValue: "3.0 cents", range: "0.0 cents / 10.0 cents", step: "0.1" }
    ]
  },
  {
    title: "AGING",
    description: "Simulación de Envejecimiento Analógico. Acoplamientos inductivos, varianza de tolerancia por voz, zumbido de red y rizado de fuente de alimentación.",
    parameters: [
      { id: "vcaCrosstalk", name: "Voice Crosstalk", description: "Fuga y acoplamiento inductivo entre canales analógicos.", defaultValue: "0.007", range: "0.000 / 0.050", step: "0.001" },
      { id: "masterNoise", name: "Global Noise Floor", description: "Nivel base de soplido de ruido blanco analógico del master.", defaultValue: "-80.0 dB", range: "-100.0 dB / -40.0 dB", step: "0.5" },
      { id: "stereoBleed", name: "Stereo Cross-bleeding", description: "Cruce de canales Left/Right del sumador analógico estéreo.", defaultValue: "0.03", range: "0.00 / 0.15", step: "0.005" },
      { id: "voiceVariance", name: "Voice Pitch Variance", description: "Varianza fija del DCO (tolerancias del divisor digital).", defaultValue: "2.0 cents", range: "0.0 cents / 10.0 cents", step: "0.1" },
      { id: "unisonSpread", name: "Unison Spread Scale", description: "Multiplicador de escala de la afinación del modo unísono.", defaultValue: "1.00", range: "0.10 / 2.00", step: "0.10" },
      { id: "dcoGlobalDrift", name: "Master Clock Drift", description: "Deriva sutil y compartida de todas las voces (reloj cuarzo).", defaultValue: "0.5 cents", range: "0.0 cents / 5.0 cents", step: "0.1" },
      { id: "dcoVoiceDrift", name: "Voice Drift Amount", description: "Desviación dinámica residual por calor en la CPU divisora.", defaultValue: "0.3 cents", range: "0.0 cents / 3.0 cents", step: "0.1" },
      { id: "dcoDriftComplexity", name: "DCO Drift Complexity", description: "Nivel de fractalidad del caminante aleatorio de afinación.", defaultValue: "0.50", range: "0.00 / 1.00", step: "0.05" },
      { id: "vcaRippleDepth", name: "VCA Ripple Depth", description: "Rizado de la fuente de alimentación introducido por envolventes.", defaultValue: "0.0005", range: "0.0000 / 0.0050", step: "0.0001" },
      { id: "lfoDelayCurve", name: "LFO Onset Curve", description: "Curvatura de entrada del delay LFO (holdoff a full mod).", defaultValue: "5.0", range: "1.0 / 10.0", step: "0.1" },
      { id: "dcoDriftRate", name: "Master Drift Rate", description: "Frecuencia de ciclo máxima de la inestabilidad de tono.", defaultValue: "0.008 Hz", range: "0.001 Hz / 0.050 Hz", step: "0.001" },
      { id: "noiseFloorMul", name: "Noise Floor Mult", description: "Multiplicador ajustable por el usuario para ruido broadband.", defaultValue: "1.00", range: "0.00 / 5.00", step: "0.10" },
      { id: "mainsRippleMul", name: "Mains Ripple Mult", description: "Multiplicador ajustable por el usuario para zumbido de fuente.", defaultValue: "1.00", range: "0.00 / 5.00", step: "0.10" },
      { id: "voiceVcfFrqSpread", name: "VCF Cutoff Spread", description: "Tolerancia estática del VCF por voz (J106 = ±10 counts).", defaultValue: "10.0 counts", range: "0.0 counts / 100.0 counts", step: "1.0" },
      { id: "voiceVcfWidthSpread", name: "VCF Width Spread", description: "Tolerancia estática del tracking V/oct (J106 = ±10 cents).", defaultValue: "10.0 cents", range: "0.0 counts / 100.0 counts", step: "1.0" },
      { id: "voiceVcaGainSpread", name: "VCA Gain Spread", description: "Tolerancia estática del volumen por voz (J106 = ±2.4% gain).", defaultValue: "0.024", range: "0.000 / 0.100", step: "0.001" }
    ]
  },
  {
    title: "SYSTEM",
    description: "Parámetros globales del sistema de audio y DAC. Afinación de referencia A4, sobremuestreo, histéresis e inercias de DAC.",
    parameters: [
      { id: "a4Reference", name: "A4 Reference Pitch", description: "Afinación de referencia del sintetizador (Estándar A=440Hz).", defaultValue: "440.0 Hz", range: "400.0 Hz / 480.0 Hz", step: "1.0" },
      { id: "oversampling", name: "Internal Oversampling", description: "Factor de sobremuestreo del motor de audio (1x a 4x).", defaultValue: "1 (1x)", range: "1 / 4", step: "1.0 (Int)" },
      { id: "sliderHysteresis", name: "Slider Hysteresis", description: "Zona muerta mecánica contra ruido en potenciómetros físicos.", defaultValue: "0.01", range: "0.00 / 0.10", step: "0.005" },
      { id: "paramSlewRate", name: "Parameter Slew Rate", description: "Retraso de lag analógico al desplazar los sliders.", defaultValue: "0.95", range: "0.50 / 1.00", step: "0.01" },
      { id: "staggeredUpdateMaxMs", name: "Staggered Delay", description: "Retraso de multiplexado del DAC por voz (J106 = 2ms).", defaultValue: "2.0 ms", range: "0.0 ms / 4.0 ms", step: "0.1" }
    ]
  }
];

export interface CalibrationCSVTable {
  id: string;
  name: string;
  purpose: string;
  size: string;
  defaultValue: string;
  csvFormat: string;
}

export const calibrationCSVTables: CalibrationCSVTable[] = [
  { id: "customDacTable", name: "Tabla DAC", purpose: "Mapeo de voltajes DAC a Hertz reales de auto-oscilación y afinación del VCF.", size: "4096 filas (índices 0 a 4095)", defaultValue: "Valores experimentales del Juno-106 hardware (kr106::kV4Hz)", csvFormat: "DAC_Code,Frequency_Hz\n0,10.01\n1,10.25\n...\n4095,18520.40" },
  { id: "customVcaTable", name: "Tabla VCA", purpose: "Curva exponencial no lineal del hardware convertidor transistorizado TR17 (BA662).", size: "256 filas (índices 0 a 255)", defaultValue: "Mediciones de chips Boaris hardware (kr106::kVCATableHW)", csvFormat: "Index,Gain\n0,0.000000\n1,0.000021\n...\n255,1.000000" },
  { id: "customLfoSpeedTable", name: "Tabla LFO Speed", purpose: "Cuantización por pasos discretos de la velocidad del LFO según ROM del uPD7811G.", size: "128 filas (índices 0 a 127)", defaultValue: "Constantes de firmware kDefaultLfoSpeedTbl", csvFormat: "Index,Coeff\n0,5\n1,15\n...\n127,4096" },
  { id: "customLfoRampTable", name: "Tabla LFO Delay Ramp", purpose: "Tasa de pendiente de entrada de delay LFO (Holdoff / Ramp) según el potenciómetro.", size: "8 filas (índices 0 a 7)", defaultValue: "Constantes de firmware kDefaultLfoRampTbl", csvFormat: "Index,Increment\n0,65535\n1,1049\n...\n7,256" },
  { id: "customSubLevelTable", name: "Tabla Sub Level", purpose: "Escala de atenuación analógica por diodos y transistores del nivel del Sub-oscilador.", size: "11 filas (índices 0 a 10)", defaultValue: "Coeficientes de volumen kDefaultSubLevelTbl", csvFormat: "Index,Level\n0,0.00154\n1,0.01251\n...\n10,1.00000" }
];
