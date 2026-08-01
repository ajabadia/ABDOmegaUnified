/**
 * @purpose Renderiza un componente de entrada de color con una etiqueta, un campo de entrada personalizado de color y una paleta de predefinidos colores para selección.
 * @purpose_en Renders a color input component with a label, a custom color input field, and a palette of pre-defined color swatches for selection.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1i5ch90
 * @lastUpdated 2026-06-17T22:33:36.795Z
 */

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const SWATCHES = ['#00f2ff', '#ffbf00', '#dc143c', '#00a86b', '#ff6b35', '#a855f7', '#ffffff', '#000000'];

const COLOR_NAMES: Record<string, string> = {
  '#00f2ff': 'Cyan',
  '#ffbf00': 'Amber',
  '#dc143c': 'Crimson',
  '#00a86b': 'Green',
  '#ff6b35': 'Orange',
  '#a855f7': 'Purple',
  '#ffffff': 'White',
  '#000000': 'Black',
};

export function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div>
      <label className="text-xs text-gray-500 block">{label}</label>
      <div className="flex items-center gap-1">
        <input
          className="w-5 h-5 rounded border border-[#333] cursor-pointer"
          type="color"
          aria-label={`${label} color picker`}
          value={value || '#333333'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white font-mono"
          aria-label={`${label} hex value`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="flex gap-0.5 mt-1">
        {SWATCHES.map((s) => (
          <button
            key={s}
            aria-label={`${COLOR_NAMES[s] || s} color swatch`}
            className={`w-4 h-4 rounded border ${value === s ? 'border-white' : 'border-transparent'}`}
            style={{ backgroundColor: s }}
            onClick={() => onChange(s)}
          />
        ))}
      </div>
    </div>
  );
}
