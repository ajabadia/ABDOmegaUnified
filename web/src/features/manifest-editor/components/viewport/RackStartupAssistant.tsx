'use client';

/**
 * @purpose Renderiza una asistente de inicio de sesión sobre un bastidor vacío en el editor de manifesto OMEGA, proporcionando opciones para abrir una galería, enlazar una carpeta de trabajo o crear un nuevo bastidor desde cero.
 * @purpose_en Renders a startup assistant overlay for an empty rack in the OMEGA manifest editor, providing options to open a gallery, link a workspace directory, or create a new rack from scratch.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1trlxlc
 * @lastUpdated 2026-06-20T09:44:42.880Z
 */

import { Zap, Layout, FolderOpen, Settings } from 'lucide-react';

interface RackStartupAssistantProps {
  /** Open the blueprint/template gallery (typically opens the right dock or a modal). */
  onOpenGallery?: (() => void) | undefined;
  /** Open the workspace link dialog (file picker for the VFS root). */
  onLinkWorkspace?: (() => void) | undefined;
  /** Dismiss the overlay and start with a blank rack ready to receive new elements. */
  onCreateFromScratch?: (() => void) | undefined;
  /** True when a workspace folder is already linked — adjusts the Link Workspace label. */
  isDirectoryLinked?: boolean | undefined;
  /** Optional element count for telemetry / messaging (e.g. "0 elements"). */
  elementCount?: number | undefined;
}

/**
 * RackStartupAssistant
 * Startup assistant overlay shown when the rack is empty.
 * Restored to the clean layout of the backup project with proper backdrop-blur.
 */
export default function RackStartupAssistant({
  onOpenGallery,
  onLinkWorkspace,
  onCreateFromScratch,
  isDirectoryLinked = false,
}: RackStartupAssistantProps) {
  return (
    <div data-startup-assistant className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none">
      <div className="w-[500px] p-8 border border-primary/20 bg-[#0a0a0b] shadow-[0_0_80px_rgba(0,242,255,0.1)] flex flex-col gap-8 rounded-xs relative overflow-hidden pointer-events-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

        <div className="text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/10 border border-primary/30 rounded-xs flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-primary text-[16px] font-black uppercase tracking-[0.2em] mb-2">Initialize Canvas</h2>
          <p className="text-foreground/50 text-[10px] uppercase tracking-wider leading-relaxed">
            The virtual rack is empty. Select a starting point for your module.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onOpenGallery}
            aria-label="Open blueprint gallery"
            className="flex flex-col items-center gap-3 p-5 border border-outline bg-white/5 hover:border-primary/50 hover:bg-primary/10 transition-all group rounded-xs cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors">
              <Layout className="w-5 h-5 text-foreground/50 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <span className="block text-[10px] font-black uppercase tracking-widest text-foreground/70 group-hover:text-foreground mb-1">Blueprint Gallery</span>
              <span className="block text-[8px] text-foreground/40 font-bold uppercase tracking-widest">Inject Template</span>
            </div>
          </button>

          <button
            onClick={onLinkWorkspace}
            aria-label={isDirectoryLinked ? 'Open linked workspace' : 'Link workspace directory'}
            className="flex flex-col items-center gap-3 p-5 border border-outline bg-white/5 hover:border-primary/50 hover:bg-primary/10 transition-all group rounded-xs cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors">
              <FolderOpen className="w-5 h-5 text-foreground/50 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <span className="block text-[10px] font-black uppercase tracking-widest text-foreground/70 group-hover:text-foreground mb-1">
                {isDirectoryLinked ? 'Workspace Linked' : 'Link Workspace'}
              </span>
              <span className="block text-[8px] text-foreground/40 font-bold uppercase tracking-widest">
                {isDirectoryLinked ? 'Folder Bound ✓' : 'Load Directory'}
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4 opacity-50">
          <div className="flex-1 h-px bg-outline" />
          <span className="text-[8px] uppercase tracking-widest text-foreground/50">OR</span>
          <div className="flex-1 h-px bg-outline" />
        </div>

        <button
          onClick={onCreateFromScratch}
          aria-label="Create rack from scratch"
          className="w-full py-4 border border-outline bg-black/40 hover:border-primary/50 hover:bg-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/60 hover:text-primary transition-all flex items-center justify-center gap-3 rounded-xs group cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 group-hover:animate-spin-slow" />
          <span>Create from Scratch</span>
        </button>
      </div>
    </div>
  );
}
