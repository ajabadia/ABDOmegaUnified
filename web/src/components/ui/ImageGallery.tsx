"use client";

/**
 * @purpose Gestiona una galería de imágenes con navegación previa y siguiente.
 * @purpose_en Manages a gallery of images with navigation previa and siguiente.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:1ryb3a5
 * @lastUpdated 2026-06-15T10:51:56.863Z
 */


import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { GalleryThumbnailGrid } from "./gallery/GalleryThumbnailGrid";
import { GalleryLightbox } from "./gallery/GalleryLightbox";

interface GalleryItem {
  url: string;
  caption?: string;
  description?: string;
}

interface ImageGalleryProps {
  items: GalleryItem[];
  title?: string;
  altBase?: string;
  className?: string;
}

export function ImageGallery({ 
  items, 
  title = "Interface Modules", 
  altBase = "Gallery image",
  className 
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const handleNext = React.useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % items.length);
    }
  }, [selectedIndex, items.length]);

  const handlePrev = React.useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
    }
  }, [selectedIndex, items.length]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") setSelectedIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, handleNext, handlePrev]);

  return (
    <div className={cn("space-y-8 pt-16", className)}>
      {title && (
        <div className="flex items-end justify-between border-b border-primary/20 pb-4">
          <h2 className="font-headline text-xl font-bold uppercase tracking-widest">
            {title}
          </h2>
          <span className="text-[10px] font-headline text-zinc-500 uppercase tracking-widest">
            {items.length} Modules Loaded
          </span>
        </div>
      )}
      
      <GalleryThumbnailGrid 
        items={items} 
        altBase={altBase} 
        onSelect={setSelectedIndex} 
      />

      <AnimatePresence>
        {selectedIndex !== null && (
          <GalleryLightbox 
            items={items} 
            selectedIndex={selectedIndex} 
            setSelectedIndex={setSelectedIndex} 
            handleNext={handleNext} 
            handlePrev={handlePrev} 
            altBase={altBase} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
