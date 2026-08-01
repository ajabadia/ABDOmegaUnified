/**
 * @purpose Gestiona un layout de grid para mostrar thumbnails de galería con efectos de animación y hover.
 * @purpose_en Manages a grid layout for displaying gallery thumbnails with animations and hover effects.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:11t6ny0
 * @lastUpdated 2026-06-15T10:51:48.651Z
 */

import Image from "next/image";
import { motion } from "framer-motion";

interface GalleryItem {
  url: string;
  caption?: string;
}

interface GalleryThumbnailGridProps {
  items: GalleryItem[];
  altBase: string;
  onSelect: (index: number) => void;
}

export function GalleryThumbnailGrid({ items, altBase, onSelect }: GalleryThumbnailGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {items.map((item, i) => (
        <motion.div
          key={item.url}
          whileHover={{ y: -5, scale: 1.05 }}
          onClick={() => onSelect(i)}
          className="cursor-pointer group relative"
        >
          <div className="aspect-square relative overflow-hidden rounded-sm bg-zinc-900/20">
            <Image
              src={item.url}
              alt={item.caption || `${altBase} ${i + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
              className="object-cover opacity-50 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
              <p className="text-[10px] font-headline font-bold uppercase text-primary tracking-[0.2em] truncate">
                {item.caption || `Module 0${i + 1}`}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
