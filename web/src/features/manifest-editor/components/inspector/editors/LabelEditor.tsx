/**
 * @purpose Renderiza un componente para editar propiedades del etiquetado en el editor de manifesto OMEGA, incluyendo campos comunes y configuraciones avanzadas como tamaño de fuente y color.
 * @purpose_en Renders a component for editing label properties in the OMEGA manifest editor, including common fields and optional advanced settings like font size and color.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:4,sig:1xo16qe
 * @lastUpdated 2026-06-15T11:30:05.216Z
 */

import type { ComponentNode } from '../../../../../omega-ui-core/types/rack';
import { CommonFields } from './CommonFields';
import { VariantSelect } from './VariantSelect';
import { ColorInput } from './ColorInput';

export interface LabelEditorProps {
  node: ComponentNode;
  onChange: (updates: Partial<ComponentNode>) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
}

export function LabelEditor({ node, onChange, inspectorLevel }: LabelEditorProps) {
  const s = node.style;
  const lvl = inspectorLevel || 'medium';
  const showMedium = lvl === 'medium' || lvl === 'advanced';
  const showAdvanced = lvl === 'advanced';

  return (
    <div className="space-y-3 p-3">
      <CommonFields
        id={node.id} label={node.label}
        x={node.pos.x} y={node.pos.y}
        width={node.size.width} height={node.size.height}
        onChange={(u) => onChange(u as Partial<ComponentNode>)}
      />
      {showMedium && (
        <>
          <VariantSelect
            elementType="label"
            value={s.variant || ''}
            onChange={(v) => onChange({ style: { ...s, variant: v } })}
          />
          <ColorInput
            label="Font Color"
            value={s.fontColor || ''}
            onChange={(c) => onChange({ style: { ...s, fontColor: c } })}
          />
        </>
      )}
      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500 block">Font Size</label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              type="number"
              value={s.fontSize ?? 10}
              onChange={(e) => onChange({ style: { ...s, fontSize: Number(e.target.value) } })}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block">Font</label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              value={s.font || ''}
              onChange={(e) => onChange({ style: { ...s, font: e.target.value } })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
