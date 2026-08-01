/**
 * @purpose Gestiona un visualizador de audio que muestra barras que se mueven y cambian de color según si el audio está reproduciendo.
 * @purpose_en Renders a visualizer for audio that displays bars moving and changing color based on whether the audio is playing.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1qrj209
 * @lastUpdated 2026-06-15T10:50:37.850Z
 */

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  isPlaying: boolean;
}

export function AudioVisualizer({ isPlaying }: AudioVisualizerProps) {
  // Deterministic visualizer data (Pure & Idempotent)
  const visualizerBars = React.useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    seed1: (i * 0.1337) % 1,
    seed2: (i * 0.4242) % 1,
    seed3: (i * 0.7777) % 1
  })), []);

  return (
    <div className="h-32 flex items-center justify-center gap-1.5 px-4 bg-black/40 rounded-sm border border-white/[0.02] relative overflow-hidden">
      {visualizerBars.map((bar, i) => (
        <motion.div
          key={i}
          animate={{ 
            height: isPlaying 
              ? [
                  bar.seed1 * 20 + 5 + (Math.sin(i * 0.2) * 20), 
                  bar.seed2 * 50 + 30 + (Math.cos(i * 0.3) * 30), 
                  bar.seed3 * 20 + 5 + (Math.sin(i * 0.2) * 20)
                ] 
              : 4 
          }}
          transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
          className={cn(
            "flex-1 rounded-full transition-colors duration-500",
            isPlaying ? "bg-primary/40" : "bg-zinc-800"
          )}
          style={{ height: '10%' }}
        />
      ))}
    </div>
  );
}
