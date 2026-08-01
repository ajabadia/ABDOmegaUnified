/**
 * @purpose Valida los datos manifest y contrato de OMEGA utilizando esquemas y reglas industriales.
 * @purpose_en Validates OMEGA manifest and contract data using schemas and industrial rules.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:5,sig:1sr5m5k
 * @lastUpdated 2026-06-15T17:03:34.201Z
 */

import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from './wasmLoader';
import type { ValidationIssue } from '@/types/validation';
import { SchemaValidator } from './validation/schemaValidator';
import { IndustrialRules } from './validation/industrialRules';

export class ValidationService {
  /**
   * Orchestrates the complete validation pipeline (Schema + Industrial Rules).
   */
  static validate(manifest: OMEGA_Manifest, contract: (OmegaContract | OMEGA_Contract) | null = null): ValidationIssue[] {
    // 1. Technical Schema Validation (AJV)
    const schemaIssues = SchemaValidator.validate(manifest);
    
    // 2. Industrial/Business Rules (Era 7)
    const industrialIssues = IndustrialRules.validate(manifest, contract);

    return [...schemaIssues, ...industrialIssues];
  }
}
