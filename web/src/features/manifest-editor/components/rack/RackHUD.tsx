'use client';

/**
 * @purpose Renderiza una interfaz de usuario (HUD) para cambiar entre modo bastidor y navegación por tablas en el editor de manifesto OMEGA.
 * @purpose_en Renders a HUD for switching between rack mode and tab navigation in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:1pyp7xs
 * @lastUpdated 2026-06-20T09:43:50.169Z
 */

import { Settings2, PlayCircle } from 'lucide-react';

import type { ManifestEntity, TabName } from '@/types/manifest';

interface RackHUDProps {
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  activeTab: TabName;
  setActiveTab: (val: TabName) => void;
  allElements: ManifestEntity[];
  planes: string[];
}

/**
 * RackHUD (v7.2.3)
 * Industrial overlay for rack mode switching and tab navigation.
 */
export const RackHUD = ({ 
  isLiveMode, 
  setIsLiveMode, 
  activeTab, 
  setActiveTab, 
  allElements,
  planes
}: RackHUDProps) => {
  const tabs = planes;

  return (
    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-50 pointer-events-none" onClick={(e) => e.stopPropagation()}>
      {/* MODE TOGGLE */}
      <div className="flex wb-surface border wb-outline rounded-xs p-1 shadow-2xl backdrop-blur-md transition-colors duration-500 pointer-events-auto">
        <button 
          onClick={() => setIsLiveMode(false)} 
          aria-label="Switch to engineering mode"
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xs text-[8px] font-black tracking-[0.1em] transition-all ${!isLiveMode ? 'bg-primary text-white shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'wb-text-muted hover:wb-text'}`}
        >
          <Settings2 className="w-3 h-3" />
          <span>ENGINEERING</span>
        </button>
        <button 
          onClick={() => setIsLiveMode(true)} 
          aria-label="Switch to live mode"
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xs text-[8px] font-black tracking-[0.1em] transition-all ${isLiveMode ? 'bg-accent text-white shadow-[0_0_15px_rgba(255,140,0,0.3)]' : 'wb-text-muted hover:wb-text'}`}
        >
          <PlayCircle className="w-3 h-3" />
          <span>LIVE</span>
        </button>
      </div>

      {/* TAB NAVIGATION (Centered or Left-Aligned near toggle) */}
      <div className="flex gap-1 wb-surface p-1 rounded-xs border wb-outline shadow-2xl backdrop-blur-md transition-colors duration-500 pointer-events-auto mr-auto ml-4">
        {tabs.map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)} 
            aria-label={`Switch to ${t} tab`}
            className={`px-4 py-1.5 rounded-xs text-[8px] font-black tracking-[0.1em] transition-all flex items-center gap-2 ${activeTab === t ? (isLiveMode ? 'bg-accent text-white shadow-[0_0_10px_rgba(255,140,0,0.2)]' : 'bg-primary text-white shadow-[0_0_10px_rgba(0,240,255,0.2)]') : 'wb-text-muted hover:wb-text'}`}
          >
            <span>{t}</span>
            {!isLiveMode && (
              <span className={`px-1.5 py-0.5 rounded-xs text-[6px] font-mono ${activeTab === t ? 'bg-white/20 text-white' : 'bg-outline/20 wb-text-muted'}`}>
                {allElements.filter(i => (i.presentation?.tab || 'MAIN') === t).length}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
