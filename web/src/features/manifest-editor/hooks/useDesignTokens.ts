'use client';

/**
 * @purpose Proporciona una notificacion emergente.
 * @purpose_en Re-exports the `useDesignTokens` hook and its type from the canonical omega-ui-core library for backward compatibility.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:cxplr6
 * @lastUpdated 2026-06-17T22:23:07.472Z
 */

export { useDesignTokens } from '@/omega-ui-core/hooks/useDesignTokens';
export type { DesignTokenOverrides } from '@/omega-ui-core/hooks/useDesignTokens';