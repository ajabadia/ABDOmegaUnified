'use client';

/**
 * @purpose Renderiza campos para edición en una interfaz de editor de manifesto según las definiciones de campo y datos.
 * @purpose_en Renders fields for editing in a manifest editor interface based on field definitions and data.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:tve5pm
 * @lastUpdated 2026-06-17T22:33:42.855Z
 */

import React from 'react';
import type { FieldDef, FieldOption } from './fieldDefs';
import { getFieldValue, buildPatch } from './fieldDefs';
import PropertyField from '../PropertyField';
import { IndustrialInput } from '@/features/manifest-editor/components/primitives/IndustrialInput';
import { IndustrialTextArea } from '@/features/manifest-editor/components/primitives/IndustrialTextArea';

interface FieldRendererProps<T = unknown> {
  fields: FieldDef<T>[];
  data: T;
  onUpdate: (patch: Partial<T>) => void;
  layout?: 'stack' | 'grid';
  gridCols?: number;
  label?: string;
  helper?: string;
}

function renderField<T>(
  field: FieldDef<T>,
  data: T,
  onUpdate: (patch: Partial<T>) => void,
): React.ReactNode {
  const currentValue = field.path ? getFieldValue(data, field.path) : undefined;

  if (field.type === 'badge') {
    const badgeText = field.badgeValue
      ? typeof field.badgeValue === 'function'
        ? field.badgeValue(data)
        : field.badgeValue
      : String(currentValue ?? '—');
    return (
      <PropertyField label={field.label} readOnly>
        <div className={`w-full py-2 px-3 wb-surface-subtle border wb-outline rounded-xs text-[10px] ${field.mono ? 'font-mono' : 'font-medium'}`}>
          {badgeText}
        </div>
      </PropertyField>
    );
  }

  if (field.type === 'readonly') {
    return (
      <PropertyField label={field.label}>
        <div className={`w-full py-2 px-3 wb-surface-subtle border wb-outline rounded-xs text-[10px] ${field.mono ? 'font-mono' : 'font-medium'}`}>
          {String(currentValue ?? '—')}
        </div>
      </PropertyField>
    );
  }

  if (field.type === 'input' || field.type === 'number') {
    const strValue = currentValue !== undefined && currentValue !== null ? String(currentValue) : '';
    return (
      <PropertyField label={field.label}>
        <IndustrialInput
          size={field.size}
          type={field.type === 'number' ? 'number' : 'text'}
          value={strValue}
          onChange={(v: string) => {
            if (!field.path) return;
            const parsed = field.type === 'number' ? (parseInt(v, 10) || 0) : v;
            onUpdate(buildPatch(data, field.path, parsed));
          }}
          {...(field.mono ? { mono: true } : {})}
          {...(field.align ? { align: field.align } : {})}
          {...(field.readOnly ? { readOnly: true } : {})}
          {...(field.placeholder ? { placeholder: field.placeholder } : {})}
        />
      </PropertyField>
    );
  }

  if (field.type === 'textarea') {
    const strValue = currentValue !== undefined && currentValue !== null ? String(currentValue) : '';
    return (
      <PropertyField label={field.label}>
        <IndustrialTextArea
          value={strValue}
          onChange={(v: string) => {
            if (!field.path) return;
            onUpdate(buildPatch(data, field.path, v));
          }}
          placeholder={field.placeholder}
          rows={2}
        />
      </PropertyField>
    );
  }

  if (field.type === 'grid-buttons') {
    if (!field.options) return null;
    const cols = field.columns || 2;
    const isMulti = field.multi === true;
    const currentVal = field.path ? getFieldValue(data, field.path) : undefined;

    return (
      <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase wb-text-muted tracking-wider ml-1 flex items-center gap-1.5">
          {field.label}
        </label>
        <div className={`grid grid-cols-${cols} wb-surface-strong border wb-outline rounded-xs overflow-hidden`}>
          {field.options.map((opt: FieldOption) => {
            let isActive = false;
            if (isMulti && Array.isArray(currentVal)) {
              isActive = currentVal.some((t: string) => t.toLowerCase() === opt.value.toLowerCase());
            } else {
              isActive = String(currentVal) === opt.value;
            }

            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (!field.path) return;
                  if (isMulti) {
                    const arr: string[] = Array.isArray(currentVal) ? [...currentVal] : [];
                    const lower = opt.value.toLowerCase();
                    const exists = arr.some((t: string) => t.toLowerCase() === lower);
                    const next = exists ? arr.filter((t: string) => t.toLowerCase() !== lower) : [...arr, opt.value];
                    onUpdate(buildPatch(data, field.path, next));
                  } else {
                    onUpdate(buildPatch(data, field.path, opt.value));
                  }
                }}
                aria-label={`Select: ${opt.label}`}
                className={`flex flex-col items-center justify-center py-2 px-1 text-center transition-all border-b-2 ${
                  isActive
                    ? 'bg-primary/15 text-primary border-primary font-black'
                    : 'wb-text-muted border-transparent hover:bg-primary/5 hover:wb-text'
                }`}
              >
                {opt.icon && <opt.icon className="w-3.5 h-3.5 mb-0.5" />}
                <span className="text-[8px] font-black uppercase tracking-widest leading-none">{opt.label}</span>
                {opt.sublabel && (
                  <span className="text-[6px] opacity-60 normal-case mt-0.5 leading-none">{opt.sublabel}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

export function FieldRenderer<T>({ fields, data, onUpdate, layout, gridCols, label, helper }: FieldRendererProps<T>) {
  const content = layout === 'grid' ? (
    <div className={`grid grid-cols-${gridCols || 2} gap-2`}>
      {fields.map((field) => (
        <div key={field.key} className={field.colSpan ? `col-span-${field.colSpan}` : ''}>
          {renderField(field, data, onUpdate)}
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-2">
      {fields.map((field) => (
        <div key={field.key}>{renderField(field, data, onUpdate)}</div>
      ))}
    </div>
  );

  if (label) {
    return (
      <div className="space-y-2">
        <span className="text-[8px] font-black uppercase wb-text-muted tracking-wider flex items-center gap-1.5">
          {label}
        </span>
        {content}
        {helper && (
          <p className="text-[6px] wb-text-muted uppercase font-bold tracking-tighter italic opacity-70">
            {helper}
          </p>
        )}
      </div>
    );
  }

  return content;
}
