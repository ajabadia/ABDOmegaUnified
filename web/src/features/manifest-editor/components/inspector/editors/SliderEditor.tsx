/**
 * @purpose Gestiona un componente editor de slider para el editor de manifesto OMEGA, permitiendo a los usuarios personalizar las propiedades del slider como orientación, color y configuraciones de enlaza según el nivel seleccionado del inspector.
 * @purpose_en Renders a slider editor component for the OMEGA manifest editor, allowing users to customize slider properties such as orientation, color, and binding settings based on the selected inspector level.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:4,sig:ug3b06
 * @lastUpdated 2026-06-15T11:30:29.812Z
 */

import type { ComponentNode, SliderOrientation } from '../../../../../omega-ui-core/types/rack';
import { CommonFields } from './CommonFields';
import { ColorInput } from './ColorInput';
import { BindSelect } from './BindSelect';

export interface SliderEditorProps {
  node: ComponentNode;
  onChange: (updates: Partial<ComponentNode>) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
}

export function SliderEditor({ node, onChange, inspectorLevel }: SliderEditorProps) {
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
          <div>
            <label className="text-xs text-gray-500 block">Orientation</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              value={s.orientation || 'vertical'}
              onChange={(e) => onChange({ style: { ...s, orientation: e.target.value as SliderOrientation } })}
            >
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </div>
          <ColorInput
            label="Color"
            value={s.color || ''}
            onChange={(c) => onChange({ style: { ...s, color: c } })}
          />
        </>
      )}
      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block">Asset</label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              value={s.asset || ''}
              onChange={(e) => onChange({ style: { ...s, asset: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Frames</label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              type="number"
              value={s.frames ?? 1}
              onChange={(e) => onChange({ style: { ...s, frames: Number(e.target.value) } })}
            />
          </div>
        </div>
      )}
      {showMedium && (
        <BindSelect
          value={node.bind?.target || ''}
          onChange={(t) => onChange({ bind: { target: t, min: node.bind?.min, max: node.bind?.max, default: node.bind?.default } })}
        />
      )}
      {showAdvanced && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500 block">Min</label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              type="number"
              value={node.bind?.min ?? 0}
              onChange={(e) => onChange({ bind: { target: node.bind?.target || '', min: Number(e.target.value), max: node.bind?.max, default: node.bind?.default } })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Max</label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              type="number"
              value={node.bind?.max ?? 127}
              onChange={(e) => onChange({ bind: { target: node.bind?.target || '', min: node.bind?.min, max: Number(e.target.value), default: node.bind?.default } })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Default</label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              type="number"
              value={node.bind?.default ?? 64}
              onChange={(e) => onChange({ bind: { target: node.bind?.target || '', min: node.bind?.min, max: node.bind?.max, default: Number(e.target.value) } })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
