/**
 * @purpose Gestiona un componente para editar propiedades de visualización en el editor de manifesto OMEGA, incluyendo campos para activos y cuadros para configuraciones avanzadas, y selección de vinculación para ajustes intermedios.
 * @purpose_en Manages a component for editing display properties in the OMEGA manifest editor, including fields for assets and frames for advanced settings, and bind selection for intermediate adjustments.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:3,sig:g58mcs
 * @lastUpdated 2026-06-15T11:29:46.256Z
 */

import type { ComponentNode } from '../../../../../omega-ui-core/types/rack';
import { CommonFields } from './CommonFields';
import { BindSelect } from './BindSelect';

export interface DisplayEditorProps {
  node: ComponentNode;
  onChange: (updates: Partial<ComponentNode>) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
}

export function DisplayEditor({ node, onChange, inspectorLevel }: DisplayEditorProps) {
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
      {showAdvanced && (
        <>
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
        </>
      )}
      {showMedium && (
        <BindSelect
          value={node.bind?.target || ''}
          onChange={(t) => onChange({ bind: { ...node.bind, target: t } })}
        />
      )}
    </div>
  );
}
