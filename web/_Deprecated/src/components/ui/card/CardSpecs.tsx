/**
 * @purpose Renderiza especificaciones de instrumentos en una interfaz de usuario.
 * @purpose_en Renders specifications of instruments in a user interface.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1anmbfv
 * @lastUpdated 2026-06-15T10:51:12.390Z
 */


interface SpecItem {
  label: string;
  value: string;
}

interface CardSpecsProps {
  specs: SpecItem[];
  instrumentId: string;
}

export function CardSpecs({ specs, instrumentId }: CardSpecsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 pt-4">
      {specs.map((item) => (
        <div 
          key={`${instrumentId}-${item.label}`} 
          className="p-3 bg-zinc-900/50 border border-white/5 rounded-none group-hover:border-primary/20 transition-colors"
        >
          <p className="text-[8px] text-zinc-600 uppercase font-headline font-bold tracking-widest mb-1">
            {item.label}
          </p>
          <p className="text-[10px] font-headline font-black text-zinc-300 uppercase truncate">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
