"use client";

/**
 * @purpose Renderiza una tarjeta UI para mostrar información sobre instrumentos musicales, incluyendo imágenes, encabezados, descripciones, especificaciones y un pie de página con un enlace de detalle.
 * @purpose_en Renders a UI card for displaying information about musical instruments, including images, headers, descriptions, specifications, and a footer with a detail link.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:7,sig:1gxrm9v
 * @lastUpdated 2026-06-15T10:52:08.133Z
 */


import { GlassPanel } from "./GlassPanel";
import { type Instrument } from "@/data/instruments";
import { useTranslations } from "next-intl";
import { CardImage } from "./card/CardImage";
import { CardHeader } from "./card/CardHeader";
import { CardSpecs } from "./card/CardSpecs";
import { CardFooter } from "./card/CardFooter";

interface InstrumentCardProps {
  instrument: Instrument;
}

export function InstrumentCard({ instrument }: InstrumentCardProps) {
  const t = useTranslations('instruments');
  const tb = useTranslations('common.buttons');
  
  // Normalize ID to match translation keys (e.g., abd-junio-601 -> junio601)
  const idKey = instrument.id.replace('abd-', '').replace(/-/g, '');

  return (
    <GlassPanel 
      hoverEffect 
      className="group flex flex-col h-full overflow-hidden border-white/5"
    >
      {/* Accent Strip */}
      <div 
        className="absolute top-0 left-0 w-full h-1" 
        style={{ backgroundColor: instrument.colors.primary }} 
      />

      <CardImage 
        src={instrument.image} 
        alt={instrument.name} 
        category={instrument.category} 
      />

      {/* Content */}
      <div className="flex-1 space-y-6">
        <CardHeader 
          name={instrument.name} 
          tagline={t(`${idKey}.tagline`)} 
          version={instrument.version} 
          primaryColor={instrument.colors.primary} 
        />

        <p className="text-sm text-zinc-500 font-body leading-relaxed line-clamp-3">
          {t(`${idKey}.description`)}
        </p>

        <CardSpecs 
          specs={instrument.specs[0].items} 
          instrumentId={instrument.id} 
        />
      </div>

      <CardFooter 
        href={`/instrument/${instrument.id}`} 
        label={tb('viewDetail')} 
        instrumentName={instrument.name} 
      />
    </GlassPanel>
  );
}
