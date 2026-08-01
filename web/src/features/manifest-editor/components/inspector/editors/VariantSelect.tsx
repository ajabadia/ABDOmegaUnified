/**
 * @purpose Renderiza un menú desplegable para seleccionar variantes según el tipo de elemento en el editor de manifesto OMEGA.
 * @purpose_en Renders a dropdown menu for selecting variants based on the type of element in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1lhp7k8
 * @lastUpdated 2026-06-15T11:30:38.637Z
 */

const VARIANTS: Record<string, { id: string; label: string }[]> = {
  knob: [
    { id: 'A_cyan', label: 'Alabaster Cyan' },
    { id: 'B_amber', label: 'Brass Amber' },
    { id: 'C_ruby', label: 'Crimson Ruby' },
    { id: 'D_jade', label: 'Dark Jade' },
  ],
  led: [
    { id: 'led_cyan', label: 'Cyan LED' },
    { id: 'led_amber', label: 'Amber LED' },
    { id: 'led_red', label: 'Red LED' },
    { id: 'led_green', label: 'Green LED' },
  ],
  label: [
    { id: 'label_standard', label: 'Standard Label' },
    { id: 'label_tiny', label: 'Tiny Label' },
    { id: 'label_display', label: 'Display Label' },
  ],
};

interface VariantSelectProps {
  elementType: string;
  value: string;
  onChange: (variant: string) => void;
}

export function VariantSelect({ elementType, value, onChange }: VariantSelectProps) {
  const variants = VARIANTS[elementType];
  if (!variants) return null;

  return (
    <div>
      <label className="text-[10px] text-gray-500 block">Variant</label>
      <select
        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">None</option>
        {variants.map((v) => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </select>
    </div>
  );
}
