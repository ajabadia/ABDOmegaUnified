/**
 * @purpose Proporciona definiciones del campo de exportación, funciones de recuperación de valor y un renderizador de campo para uso en el editor de manifesto OMEGA.
 * @purpose_en Exports field definitions, value retrieval functions, and a field renderer for use in the OMEGA manifest editor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1y423jx
 * @lastUpdated 2026-06-15T11:30:49.681Z
 */

export type { FieldDef, FieldType, FieldOption } from './fieldDefs';
export { getFieldValue, buildPatch } from './fieldDefs';
export { FieldRenderer } from './FieldRenderer';
