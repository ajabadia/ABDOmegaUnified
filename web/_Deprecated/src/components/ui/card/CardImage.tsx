/**
 * @purpose Renderiza una imagen con un etiqueta de categoría dentro de un componente de tarjeta.
 * @purpose_en Renders an image with a category label inside a card component.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:10wxxiu
 * @lastUpdated 2026-06-15T10:51:09.242Z
 */

import Image from "next/image";

interface CardImageProps {
  src: string;
  alt: string;
  category: string;
}

export function CardImage({ src, alt, category }: CardImageProps) {
  return (
    <div className="relative aspect-video mb-6 overflow-hidden rounded-sm bg-zinc-900">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
      />
      <div className="absolute top-3 left-3">
        <span className="px-2 py-1 bg-zinc-950/80 backdrop-blur-md text-[10px] font-headline font-bold uppercase tracking-widest text-zinc-400 border border-white/5">
          {category}
        </span>
      </div>
    </div>
  );
}
