/**
 * @purpose Renderiza un componente pie de tarjeta con un botón enlazado que muestra el nombre del instrumento y su etiqueta.
 * @purpose_en Renders a card footer component with a linked button displaying an instrument name and label.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1frpsko
 * @lastUpdated 2026-06-16T17:35:39.170Z
 */

import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "../Button";

interface CardFooterProps {
  href: string;
  label: string;
  instrumentName: string;
}

export function CardFooter({ href, label, instrumentName }: CardFooterProps) {
  return (
    <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-end">
      <Link 
        href={href}
        aria-label={`${label} ${instrumentName}`}
      >
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-3 px-6 py-5 text-[10px] uppercase tracking-widest font-bold border-white/10 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary group/btn"
          aria-label={`${label} ${instrumentName}`}
        >
          {label}
          <ArrowUpRight size={14} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 text-primary" />
        </Button>
      </Link>
    </div>
  );
}
