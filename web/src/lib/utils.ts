/**
 * @purpose Proporciona soluciones para conflictos de Tailwind utilizando clsx y tailwind-merge.
 * @purpose_en Merges CSS classes using clsx and tailwind-merge to resolve Tailwind conflicts.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1bgcqdy
 * @lastUpdated 2026-06-15T15:17:47.982Z
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
