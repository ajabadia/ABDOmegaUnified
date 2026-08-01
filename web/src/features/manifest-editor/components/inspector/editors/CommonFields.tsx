/**
 * @purpose Renderiza una forma para editar propiedades comunes como ID, etiqueta, posición (X, Y) y tamaño (ancho, alto) en el editor de manifesto OMEGA.
 * @purpose_en Renders a form for editing common properties such as ID, label, position (X, Y), and size (width, height) in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:lh9q60
 * @lastUpdated 2026-06-15T11:29:36.513Z
 */

interface CommonFieldsProps {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onChange: (updates: Record<string, unknown>) => void;
}

export function CommonFields({ id, label, x, y, width, height, onChange }: CommonFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 font-mono">ID: {id}</div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-300 w-12">Label</label>
        <input
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white"
          value={label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-gray-500 block">X</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
            type="number"
            value={x}
            onChange={(e) => onChange({ pos: { x: Number(e.target.value), y } })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">Y</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
            type="number"
            value={y}
            onChange={(e) => onChange({ pos: { x, y: Number(e.target.value) } })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">W</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
            type="number"
            value={width}
            onChange={(e) => onChange({ size: { width: Number(e.target.value), height } })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">H</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
            type="number"
            value={height}
            onChange={(e) => onChange({ size: { width, height: Number(e.target.value) } })}
          />
        </div>
      </div>
    </div>
  );
}
