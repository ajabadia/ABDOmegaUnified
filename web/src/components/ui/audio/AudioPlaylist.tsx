/**
 * @purpose Renderiza un componente UI para mostrar y seleccionar pistas de audio en un editor de manifesto OMEGA.
 * @purpose_en Renders a UI component for displaying and selecting audio tracks in an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:t46ewr
 * @lastUpdated 2026-06-16T17:35:25.747Z
 */

import { Play, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AudioTrack {
  name: string;
  url: string;
  artist?: string;
  album?: string;
  cover?: string | null;
}

interface AudioPlaylistProps {
  tracks: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onTrackSelect: (track: AudioTrack) => void;
  t: (key: string) => string;
}

export function AudioPlaylist({ tracks, currentTrack, isPlaying, onTrackSelect, t }: AudioPlaylistProps) {
  return (
    <div className="lg:col-span-4 space-y-6">
      <div className="flex items-center justify-between">
         <span className="text-[10px] font-headline text-zinc-500 uppercase tracking-widest">
           {t('audio.playlist')}
         </span>
         <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[8px] font-headline text-zinc-400">
           {tracks.length} Artifacts
         </span>
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 styled-scroll">
        {tracks.map((track, i) => (
          <button
            key={track.url}
            onClick={() => onTrackSelect(track)}
            className={cn(
              "w-full flex items-center gap-5 p-4 rounded-sm border group transition-all relative overflow-hidden",
              currentTrack?.url === track.url
                ? "bg-primary/5 border-primary/40 text-white"
                : "bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/[0.05] hover:border-white/10"
            )}
            aria-label={`Select track: ${track.name}`}
          >
            {track.cover ? (
              <div className="relative w-10 h-10 shrink-0 rounded-sm overflow-hidden border border-white/10">
                <Image src={track.cover} alt="cover" fill className="object-cover" sizes="40px" />
              </div>
            ) : (
              <span className="text-[10px] font-mono opacity-30 w-10 text-center">0{i + 1}</span>
            )}
            <div className="flex-1 text-left">
              <div className="text-xs font-bold uppercase tracking-[0.1em] truncate group-hover:text-white transition-colors">
                {track.name}
              </div>
              {track.artist && <div className="text-[9px] text-zinc-600 uppercase font-headline">{track.artist}</div>}
            </div>
            <AnimatePresence>
              {currentTrack?.url === track.url && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-primary"
                >
                  {isPlaying ? <Activity size={14} className="animate-pulse" /> : <Play size={14} />}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>
    </div>
  );
}
