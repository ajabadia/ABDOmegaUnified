/**
 * @purpose Renderiza un componente para editar nodos de switch en el editor de manifesto OMEGA, incluyendo campos comunes, entrada de color, selección de estado y opciones de vinculación.
 * @purpose_en Renders a component for editing switch nodes in the OMEGA manifest editor, including common fields, color input, state selection, and binding options.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:4,sig:10kx93d
 * @lastUpdated 2026-06-15T11:30:34.894Z
 */

import type { ComponentNode } from '../../../../../omega-ui-core/types/rack';
import { CommonFields } from './CommonFields';
import { ColorInput } from './ColorInput';
import { BindSelect } from './BindSelect';

export interface SwitchEditorProps {
  node: ComponentNode;
  onChange: (updates: Partial<ComponentNode>) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
}

export function SwitchEditor({ node, onChange, inspectorLevel }: SwitchEditorProps) {
  const s = node.style;
  const lvl = inspectorLevel || 'medium';
  const showMedium = lvl === 'medium' || lvl === 'advanced';

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
          <ColorInput
            label="Color"
            value={s.color || ''}
            onChange={(c) => onChange({ style: { ...s, color: c } })}
          />
          <div>
            <label className="text-xs text-gray-500 block">States</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              value={s.states ?? 2}
              onChange={(e) => onChange({ style: { ...s, states: Number(e.target.value) as 2 | 3 } })}
            >
              <option value={2}>2 positions</option>
              <option value={3}>3 positions</option>
            </select>
          </div>
          <BindSelect
            value={node.bind?.target || ''}
            onChange={(t) => onChange({ bind: { ...node.bind, target: t } })}
          />
        </>
      )}
    </div>
  );
}
