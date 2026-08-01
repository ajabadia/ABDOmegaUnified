/**
 * @purpose Gestiona un componente para editar propiedades de LED en el editor de manifesto OMEGA.
 * @purpose_en Manages a component for editing LED properties in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:4,sig:1fwe7vo
 * @lastUpdated 2026-06-15T11:30:09.421Z
 */

import type { ComponentNode, LedPolarity } from '../../../../../omega-ui-core/types/rack';
import { CommonFields } from './CommonFields';
import { ColorInput } from './ColorInput';
import { BindSelect } from './BindSelect';

export interface LedEditorProps {
  node: ComponentNode;
  onChange: (updates: Partial<ComponentNode>) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
}

export function LedEditor({ node, onChange, inspectorLevel }: LedEditorProps) {
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
          <ColorInput
            label="Indicator"
            value={s.indicatorColor || ''}
            onChange={(c) => onChange({ style: { ...s, indicatorColor: c } })}
          />
          <div>
            <label className="text-xs text-gray-500 block">Polarity</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              value={s.polarity || 'normal'}
              onChange={(e) => onChange({ style: { ...s, polarity: e.target.value as LedPolarity } })}
            >
              <option value="normal">Normal</option>
              <option value="inverted">Inverted</option>
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
