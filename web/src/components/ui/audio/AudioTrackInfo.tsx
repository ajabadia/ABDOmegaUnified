/**
 * @purpose Renderiza información sobre el track de audio actual en el editor de manifesto OMEGA UI, incluyendo arte de portada, estado de reproducción y metadatos.
 * @purpose_en Renders information about the current audio track in the OMEGA manifest editor UI, including cover art, playback status, and metadata.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1v2lbuz
 * @lastUpdated 2026-06-16T17:35:30.885Z
 */

import { Info } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AudioTrack {
  name: string;
  artist?: string;
  album?: string;
  cover?: string | null;
}

interface AudioTrackInfoProps {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  showMeta: boolean;
  setShowMeta: (v: boolean) => void;
  t: (key: string) => string;
}

export function AudioTrackInfo({ currentTrack, isPlaying, showMeta, setShowMeta, t }: AudioTrackInfoProps) {
  return (
    <div className="flex justify-between items-start">
      <div className="flex gap-6 items-center">
        {currentTrack?.cover && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={currentTrack.cover}
            className="relative w-20 h-20 rounded-sm overflow-hidden border border-white/10 shadow-2xl"
          >
            <Image src={currentTrack.cover} alt="cover" fill className="object-cover" sizes="80px" />
          </motion.div>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
             <div className={cn("w-1.5 h-1.5 rounded-full shadow-lg", isPlaying ? "bg-primary shadow-primary/50 animate-pulse" : "bg-zinc-800")} />
             <div className="text-[10px] font-headline text-zinc-500 font-bold uppercase tracking-[0.2em]">
               {t('audio.streamStatus')}: {isPlaying ? t('audio.streaming') : t('audio.standby')}
             </div>
          </div>
          <h3 className="text-3xl md:text-4xl font-headline font-bold uppercase tracking-tighter text-white cyan-bloom leading-none">
            {currentTrack?.name || t('audio.initializing')}
          </h3>
          <div className="text-xs text-zinc-500 uppercase font-headline tracking-widest italic">
            {currentTrack?.artist} — {currentTrack?.album}
          </div>
        </div>
      </div>
      <button 
        onClick={() => setShowMeta(!showMeta)}
        className={cn(
          "p-3 rounded-sm border transition-all",
          showMeta ? "bg-primary text-black border-primary" : "bg-white/5 border-white/5 text-zinc-600 hover:text-white"
        )}
        aria-label={showMeta ? 'Hide metadata' : 'Show metadata'}
      >
        <Info size={20} />
      </button>
    </div>
  );
}
