/**
 * @purpose Renderiza una grilla que muestra metadatos para los tracks de audio seleccionados, incluyendo formato, frecuencia, bitrate y modo, con efectos de animación para mostrar y ocultar la grilla.
 * @purpose_en Renders a grid displaying metadata for selected audio tracks, including format, frequency, bitrate, and mode, with animation effects for showing and hiding the grid.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1yp5kok
 * @lastUpdated 2026-06-15T10:50:23.422Z
 */

import { motion, AnimatePresence } from "framer-motion";

interface AudioTrack {
  format?: string;
  sampleRate?: string;
  bitrate?: string;
  channels?: string;
}

interface AudioMetadataGridProps {
  currentTrack: AudioTrack | null;
  showMeta: boolean;
}

export function AudioMetadataGrid({ currentTrack, showMeta }: AudioMetadataGridProps) {
  return (
    <AnimatePresence>
      {showMeta && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-black/40 border border-white/5 p-6 rounded-sm space-y-4 overflow-hidden"
        >
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="text-[8px] text-zinc-600 uppercase font-headline">Container</div>
                <div className="text-[10px] text-zinc-300 font-mono uppercase">{currentTrack?.format}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[8px] text-zinc-600 uppercase font-headline">Frequency</div>
                <div className="text-[10px] text-zinc-300 font-mono uppercase">{currentTrack?.sampleRate}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[8px] text-zinc-600 uppercase font-headline">Bitrate</div>
                <div className="text-[10px] text-zinc-300 font-mono uppercase">{currentTrack?.bitrate}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[8px] text-zinc-600 uppercase font-headline">Mode</div>
                <div className="text-[10px] text-zinc-300 font-mono uppercase">{currentTrack?.channels}</div>
              </div>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
