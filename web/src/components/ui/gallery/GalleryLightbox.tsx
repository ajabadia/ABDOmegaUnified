/**
 * @purpose Gestiona un componente de galería de imagen ligera para mostrar detalles de imágenes y navegación dentro del ABDOmegaEditor.
 * @purpose_en Manages a lightbox gallery component for displaying image details and navigation within the ABDOmegaEditor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:y3d1im
 * @lastUpdated 2026-06-17T22:29:40.296Z
 */

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryItem {
  url: string;
  caption?: string;
  description?: string;
}

interface GalleryLightboxProps {
  items: GalleryItem[];
  selectedIndex: number;
  setSelectedIndex: (index: number | null) => void;
  handleNext: () => void;
  handlePrev: () => void;
  altBase: string;
}

export function GalleryLightbox({ 
  items, 
  selectedIndex, 
  setSelectedIndex, 
  handleNext, 
  handlePrev, 
  altBase 
}: GalleryLightboxProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/98 backdrop-blur-3xl perspective-[2000px] overflow-hidden"
      onClick={() => setSelectedIndex(null)}
    >
      {/* Close Button */}
      <motion.button
        className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors z-[150] p-2 hover:bg-white/5 rounded-full"
        onClick={() => setSelectedIndex(null)}
        aria-label="Close lightbox"
      >
        <X size={32} />
      </motion.button>

      {/* Cinematic Container */}
      <div className="relative w-full h-full flex flex-col items-center justify-center py-20 overflow-hidden">
        {/* Navigation Arrows */}
        <div className="absolute inset-x-8 md:inset-x-24 top-1/2 -translate-y-1/2 flex justify-between items-center z-[140] pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="p-4 bg-white/2 border border-white/5 text-white/30 rounded-full hover:bg-primary/20 hover:text-primary hover:border-primary transition-all pointer-events-auto backdrop-blur-sm"
            aria-label="Previous image"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="p-4 bg-white/2 border border-white/5 text-white/30 rounded-full hover:bg-primary/20 hover:text-primary hover:border-primary transition-all pointer-events-auto backdrop-blur-sm"
            aria-label="Next image"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Central Stage (3D Carousel) */}
        <div className="relative flex items-center justify-center w-full max-w-7xl h-[65vh]">
          {items.map((item, i) => {
            let offset = i - selectedIndex;
            if (offset > items.length / 2) offset -= items.length;
            if (offset < -items.length / 2) offset += items.length;
            
            const absOffset = Math.abs(offset);
            if (absOffset > 2) return null;

            return (
              <motion.div
                key={item.url}
                initial={false}
                animate={{
                  x: offset * 450,
                  z: absOffset * -400,
                  rotateY: offset * -45,
                  opacity: i === selectedIndex ? 1 : 0.3,
                  scale: i === selectedIndex ? 1 : 0.7,
                  filter: i === selectedIndex ? "blur(0px) brightness(1)" : "blur(12px) brightness(0.4)",
                  zIndex: 100 - Math.round(absOffset)
                }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                className="absolute w-[90vw] md:w-[850px] aspect-video cursor-pointer select-none"
                style={{ transformStyle: "preserve-3d" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (i === selectedIndex) return;
                  setSelectedIndex(i);
                }}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={item.url}
                    alt={item.caption || `${altBase} zoom ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 90vw, 850px"
                    className="object-contain"
                    priority={i === selectedIndex}
                  />
                </div>
                
                {i === selectedIndex && (
                  <div 
                    className="absolute top-full left-0 w-full h-1/2 opacity-30 pointer-events-none mt-4"
                    style={{
                      transform: "scaleY(-1)",
                      maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 80%)",
                      WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 80%)"
                    }}
                  >
                    <Image
                      src={item.url}
                      alt="reflection"
                      fill
                      sizes="(max-width: 768px) 90vw, 850px"
                      className="object-contain"
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Info & Navigation Overlay */}
        <div className="mt-12 flex flex-col items-center gap-6 z-[140]">
          <div className="flex gap-3">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setSelectedIndex(i); }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === selectedIndex ? "bg-primary w-8" : "bg-white/20 hover:bg-white/40"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-2 max-w-xl"
            >
              <div className="flex items-center justify-center gap-2">
                 <Info size={14} className="text-primary" />
                 <h3 className="font-headline font-black italic uppercase text-2xl tracking-tighter">
                   {items[selectedIndex].caption || "Module Identification"}
                 </h3>
              </div>
              <p className="text-zinc-500 font-body text-sm leading-relaxed">
                {items[selectedIndex].description || "Technical specification and module parameter overview."}
              </p>
            </motion.div>
          </AnimatePresence>

          <span className="text-[10px] font-headline font-bold uppercase tracking-[0.6em] text-white/5 select-none pt-4">
            {String(selectedIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
