/**
 * @purpose Proporciona instrumentos disponibles en el editor de manifesto OMEGA, incluyendo sus tipos y definiciones.
 * @purpose_en Exports available instruments in the OMEGA manifest editor, including their types and definitions.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:118eztn
 * @lastUpdated 2026-06-15T10:52:36.937Z
 */

import { junio601 } from "./junio-601";
import { omega } from "./omega";
import { neuronik } from "./neuronik";
import type { Instrument } from "./types";

export * from "./types";
export { junio601, omega, neuronik };

export const instruments: Instrument[] = [
  junio601,
  omega,
  neuronik
];
