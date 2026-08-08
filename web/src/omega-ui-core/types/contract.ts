/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Tipos canónicos para contratos OMEGA extraídos de módulos WASM
 * @purpose_en Canonical types for OMEGA contracts extracted from WASM modules
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:new
 * @lastUpdated 2026-06-22
 */

/**
 * Spec declarativa de un parámetro del módulo (bloque `params:` del `.acemm`).
 * Esquema WAM: complementa el contrato embebido con metadatos de interactividad
 * (exponent/log-scale, unidades, choices) que el host usa para renderizar el
 * control ligado (knob/slider/select).
 */
export interface OmegaParamSpec {
  label?: string | undefined;
  min: number;
  max: number;
  default: number;
  exponent?: number | undefined;
  units?: string | undefined;
  choices?: Array<{ label: string; value: number }> | undefined;
}

export interface OmegaContract {
  omega_version: string;
  id: string;
  name?: string;
  family?: string;
  parameters: Array<{
    id: string;
    name: string;
    min: number;
    max: number;
    default: number;
    unit?: string | undefined;
  }>;
  ports: Array<{
    id: string;
    type: 'audio' | 'cv' | 'midi' | 'gate';
    direction: 'input' | 'output';
  }>;
  firmwareHash?: string;
  params?: Record<string, OmegaParamSpec> | undefined;
}
