/**
 * @purpose Renderiza un formulario para editar propiedades de puerto en el editor de manifesto OMEGA, incluyendo orientación, polaridad, color y vinculación.
 * @purpose_en Renders a form for editing port properties in the OMEGA manifest editor, including orientation, polarity, color, and binding.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:4,sig:5vp0s1
 * @lastUpdated 2026-06-15T11:30:18.905Z
 */

import type { ComponentNode, PortOrientation, PortPolarity } from '../../../../../omega-ui-core/types/rack';
import { CommonFields } from './CommonFields';
import { ColorInput } from './ColorInput';
import { BindSelect } from './BindSelect';

export interface PortEditorProps {
  node: ComponentNode;
  onChange: (updates: Partial<ComponentNode>) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
}

export function PortEditor({ node, onChange, inspectorLevel }: PortEditorProps) {
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
          <div>
            <label className="text-[10px] text-gray-500 block">Orientation</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              value={s.orientation || 'left'}
              onChange={(e) => onChange({ style: { ...s, orientation: e.target.value as PortOrientation } })}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block">Polarity</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              value={s.polarity || 'unipolar'}
              onChange={(e) => onChange({ style: { ...s, polarity: e.target.value as PortPolarity } })}
            >
              <option value="unipolar">Unipolar</option>
              <option value="bipolar">Bipolar</option>
            </select>
          </div>
          <ColorInput
            label="Color"
            value={s.color || ''}
            onChange={(c) => onChange({ style: { ...s, color: c } })}
          />
          <BindSelect
            value={node.bind?.target || ''}
            onChange={(t) => onChange({ bind: { ...node.bind, target: t } })}
          />
        </>
      )}
    </div>
  );
}
