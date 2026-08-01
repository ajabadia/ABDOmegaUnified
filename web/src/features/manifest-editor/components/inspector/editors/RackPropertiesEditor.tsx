/**
 * @purpose Renderiza una forma para editar propiedades de un manifesto de rack, incluyendo ID, nombre, autor, versión, dimensiones, espacio de grilla y piel.
 * @purpose_en Renders a form for editing properties of a rack manifest, including ID, name, author, version, dimensions, grid spacing, and skin.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:gyuoql
 * @lastUpdated 2026-06-15T11:30:23.785Z
 */

import type { RackManifest } from '../../../../../omega-ui-core/types/rack';

export interface RackPropertiesEditorProps {
  manifest: RackManifest;
  onChange: (updates: Partial<RackManifest>) => void;
}

export function RackPropertiesEditor({ manifest, onChange }: RackPropertiesEditorProps) {
  return (
    <div className="space-y-3 p-3">
      <div className="text-xs text-gray-400 font-mono">ID: {manifest.id}</div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-300 w-16">Name</label>
        <input
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white"
          value={manifest.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-300 w-16">Author</label>
        <input
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white"
          value={manifest.author || ''}
          onChange={(e) => onChange({ author: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-300 w-16">Version</label>
        <input
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white"
          value={manifest.version}
          onChange={(e) => onChange({ version: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 block">Width</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
            type="number"
            value={manifest.width}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block">Height</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
            type="number"
            value={manifest.height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 block">Grid X</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
            type="number"
            value={manifest.grid.spacingX}
            onChange={(e) => onChange({ grid: { ...manifest.grid, spacingX: Number(e.target.value) } })}
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block">Grid Y</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
            type="number"
            value={manifest.grid.spacingY}
            onChange={(e) => onChange({ grid: { ...manifest.grid, spacingY: Number(e.target.value) } })}
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-gray-500 block">Skin</label>
        <input
          className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
          value={manifest.skin || ''}
          onChange={(e) => onChange({ skin: e.target.value })}
        />
      </div>
    </div>
  );
}
