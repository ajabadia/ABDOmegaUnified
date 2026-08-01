"use client";

/**
 * @purpose Renderiza un componente UI para mostrar pistas de audio relacionadas con una pista específica de instrumento en el editor de manifestos OMEGA.
 * @purpose_en Renders a UI component to showcase audio tracks for a specific instrument in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:10,sig:1hq2aja
 * @lastUpdated 2026-06-15T10:50:46.749Z
 */


import * as React from "react";
import { Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAudioPlayer } from "./audio/useAudioPlayer";
import { AudioPlaylist } from "./audio/AudioPlaylist";
import { AudioVisualizer } from "./audio/AudioVisualizer";
import { AudioControls } from "./audio/AudioControls";
import { AudioTrackInfo } from "./audio/AudioTrackInfo";
import { AudioMetadataGrid } from "./audio/AudioMetadataGrid";

interface AudioTrack {
  name: string;
  url: string;
  artist?: string;
  album?: string;
  sampleRate?: string;
  bitrate?: string;
  channels?: string;
  format?: string;
  cover?: string | null;
}

interface AudioShowcaseProps {
  instrumentId: string;
}

export function AudioShowcase({ instrumentId }: AudioShowcaseProps) {
  const t = useTranslations("instruments");
  const [tracks, setTracks] = React.useState<AudioTrack[]>([]);
  const [currentTrack, setCurrentTrack] = React.useState<AudioTrack | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showMeta, setShowMeta] = React.useState(false);

  const {
    isPlaying,
    currentTime,
    duration,
    progress,
    audioRef,
    progressBarRef,
    togglePlay,
    handleSeek,
    onTimeUpdate,
    onLoadedMetadata,
    formatTime,
    setIsPlaying,
    playTrack
  } = useAudioPlayer();

  React.useEffect(() => {
    async function loadTracks() {
      try {
        const response = await fetch(`/api/audio?id=${instrumentId}`);
        if (response.ok) {
          const data = await response.json();
          setTracks(data.tracks);
          if (data.tracks.length > 0) {
            setCurrentTrack(data.tracks[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load audio tracks:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTracks();
  }, [instrumentId]);

  const handleTrackSelect = (track: AudioTrack) => {
    setCurrentTrack(track);
    playTrack(track);
  };

  if (isLoading || tracks.length === 0) return null;

  return (
    <section className="w-full py-32 border-t border-white/5 bg-gradient-to-b from-transparent to-zinc-950/50">
      <div className="max-w-7xl mx-auto px-8 space-y-16">
        
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <div className="relative">
                <Activity size={18} className="relative z-10" />
                <div className="absolute inset-0 bg-primary/20 blur-md animate-pulse" />
              </div>
              <span className="text-[10px] font-headline font-bold uppercase tracking-[0.5em]">
                {t('audio.telemetry')}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-headline font-bold uppercase tracking-tight text-white leading-none">
              {t('audio.title1')} <span className="italic text-zinc-500">{t('audio.title2')}</span>
            </h2>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-[10px] font-headline text-zinc-600 uppercase tracking-widest border-l border-white/10 pl-8">
             <div className="space-y-1">
               <div className="text-zinc-400">{t('audio.sampleRate')}</div>
               <div className="font-bold text-white">{currentTrack?.sampleRate || "N/A"}</div>
             </div>
             <div className="space-y-1">
               <div className="text-zinc-400">{t('audio.bitDepth')}</div>
               <div className="font-bold text-white">{currentTrack?.bitrate || "N/A"}</div>
             </div>
             <div className="space-y-1">
               <div className="text-zinc-400">{t('audio.mastering')}</div>
               <div className="font-bold text-primary">ABD Gold Standard</div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Playlist Panel */}
          <AudioPlaylist 
            tracks={tracks} 
            currentTrack={currentTrack} 
            isPlaying={isPlaying} 
            onTrackSelect={handleTrackSelect} 
            t={t} 
          />

          {/* Mastering Console (Player) */}
          <div className="lg:col-span-8">
            <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-sm p-10 h-full flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              
              <div className="relative z-10 space-y-10">
                <AudioTrackInfo 
                  currentTrack={currentTrack} 
                  isPlaying={isPlaying} 
                  showMeta={showMeta} 
                  setShowMeta={setShowMeta} 
                  t={t} 
                />

                <AudioMetadataGrid 
                  currentTrack={currentTrack} 
                  showMeta={showMeta} 
                />

                <AudioVisualizer isPlaying={isPlaying} />

                <div className="space-y-4">
                  <div ref={progressBarRef} onClick={handleSeek} className="relative h-2 bg-white/5 rounded-full cursor-pointer group/progress overflow-hidden">
                    <motion.div className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)]" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-4">
                       <span className="text-primary">{formatTime(currentTime)}</span>
                       <span className="opacity-20">/</span>
                       <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <AudioControls 
                isPlaying={isPlaying} 
                togglePlay={togglePlay} 
              />

              <audio 
                ref={audioRef} 
                src={currentTrack?.url} 
                onTimeUpdate={onTimeUpdate} 
                onLoadedMetadata={onLoadedMetadata}
                onEnded={() => setIsPlaying(false)} 
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
