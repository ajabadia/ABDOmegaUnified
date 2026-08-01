'use client';

/**
 * @purpose Gestiona tipos y utilidades para el manejo de campos de formulario en el componente inspector del editor manifest OMEGA.
 * @purpose_en Manages types and utilities for managing form fields in the OMEGA manifest editor's inspector component.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:5,imports:1,sig:1tky67n
 * @lastUpdated 2026-06-15T11:30:42.063Z
 */

import type { LucideIcon } from 'lucide-react';

export type FieldType = 'input' | 'number' | 'textarea' | 'badge' | 'readonly' | 'grid-buttons';

export interface FieldOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: LucideIcon;
}

export interface FieldDef<T = unknown> {
  key: string;
  label: string;
  path?: string;
  type: FieldType;
  mono?: boolean;
  align?: 'left' | 'center';
  readOnly?: boolean;
  placeholder?: string;
  colSpan?: number;
  size?: 'xs' | 'sm' | 'md';
  // For grid-buttons
  options?: FieldOption[];
  columns?: number;
  multi?: boolean;
  // For badge
  badgeValue?: string | ((data: T) => string);
}

export function getFieldValue<T>(data: T, path: string): unknown {
  return path.split('.').reduce((obj: unknown, key) => (obj as Record<string, unknown>)?.[key], data as unknown);
}

export function buildPatch<T>(data: T, path: string, value: unknown): Partial<T> {
  const keys = path.split('.');
  const patch: Record<string, unknown> = {};
  let current = patch;
  for (let i = 0; i < keys.length - 1; i++) {
    const existing = keys.slice(0, i + 1).reduce((obj: unknown, k) => (obj as Record<string, unknown>)?.[k], data as unknown) || {};
    current[keys[i]] = { ...existing as Record<string, unknown> };
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return patch as Partial<T>;
}
