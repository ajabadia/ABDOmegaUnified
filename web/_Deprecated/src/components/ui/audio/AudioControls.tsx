/**
 * @purpose Renderiza controles de audio para reproducir, pausar, navegar por pistas y ajustar el volumen en el editor de manifestos OMEGA.
 * @purpose_en Renders audio controls for playing, pausing, navigating tracks, and adjusting volume in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:pgxvll
 * @lastUpdated 2026-06-16T17:35:00.128Z
 */

import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioControlsProps {
  isPlaying: boolean;
  togglePlay: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function AudioControls({ isPlaying, togglePlay, onPrev, onNext }: AudioControlsProps) {
  return (
    <div className="mt-12 flex items-center justify-between">
       <div className="flex items-center gap-6">
          <button 
            onClick={togglePlay} 
            className={cn(
              "w-20 h-20 flex items-center justify-center rounded-sm transition-all shadow-xl active:scale-95", 
              isPlaying ? "bg-white text-black shadow-white/10" : "bg-primary text-black shadow-primary/20 hover:bg-white"
            )}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
          </button>
          <div className="flex gap-2">
             <button onClick={onPrev} title="Previous track" className="p-4 bg-white/5 rounded-sm text-zinc-500 hover:text-white hover:bg-white/10 transition-all" aria-label="Previous track">
               <SkipBack size={18} />
             </button>
             <button onClick={onNext} title="Next track" className="p-4 bg-white/5 rounded-sm text-zinc-500 hover:text-white hover:bg-white/10 transition-all" aria-label="Next track">
               <SkipForward size={18} />
             </button>
          </div>
       </div>
       <div className="flex items-center gap-6 bg-black/20 p-4 rounded-sm border border-white/5">
         <div className="flex items-center gap-3">
           <Volume2 size={16} className="text-zinc-600" />
           <div className="w-32 h-1 bg-white/5 rounded-full relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-zinc-500 w-[80%]" />
           </div>
         </div>
       </div>
    </div>
  );
}
