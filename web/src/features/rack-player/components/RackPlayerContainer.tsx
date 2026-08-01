'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SharedModuleCatalogService } from '@/services/sharedModuleCatalog';
import { UniversalRenderer } from '@/omega-ui-core/renderers/UniversalRenderer';
import { manifestToTree } from '@/omega-ui-core/uca/ucaBridge';
import { Plus, Trash2, FolderPlus, X } from 'lucide-react';

export default function RackPlayerContainer() {
  const catalogModules = SharedModuleCatalogService.getCatalog();
  
  // State
  const [activePatch, setActivePatch] = useState('Default Modular Patch (Era 8)');
  const [isPlaying, setIsPlaying] = useState(false);
  const [manifests, setManifests] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  // Active Rack state (list of module IDs in current patch)
  const [rackModuleIds, setRackModuleIds] = useState<string[]>([]);
  
  // Modals
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [isNewPatchModalOpen, setIsNewPatchModalOpen] = useState(false);
  const [newPatchName, setNewPatchName] = useState('');

  // Initial load
  useEffect(() => {
    async function loadAllManifests() {
      const loaded: Record<string, any> = {};
      for (const entry of catalogModules) {
        try {
          const manifest = await SharedModuleCatalogService.fetchManifest(entry.id);
          if (manifest) {
            if (!manifest.ui) manifest.ui = {};
            manifest.ui.tree = manifestToTree(manifest);
            loaded[entry.id] = manifest;
          }
        } catch (e) {
          console.error(`Error loading manifest for ${entry.id}:`, e);
        }
      }
      setManifests(loaded);
      // Default rack contains all catalog modules
      setRackModuleIds(catalogModules.map(m => m.id));
      setLoading(false);
    }
    loadAllManifests();
  }, []);

  // Handlers
  const handleAddModuleToRack = (moduleId: string) => {
    setRackModuleIds(prev => [...prev, moduleId]);
    setIsAddModuleModalOpen(false);
  };

  const handleRemoveModuleFromRack = (indexToRemove: number) => {
    setRackModuleIds(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateNewPatch = () => {
    if (!newPatchName.trim()) return;
    setActivePatch(newPatchName.trim());
    setRackModuleIds([]); // Start empty rack
    setNewPatchName('');
    setIsNewPatchModalOpen(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0f19] text-white font-sans overflow-hidden">
      {/* Navigation Header */}
      <header className="h-12 bg-[#131b2e] border-b border-[#202b46] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-blue-500/20">
            Ω
          </div>
          <span className="font-bold text-sm tracking-wide text-white">ABDOmega Player Showcase</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
            v8.0.0 WASM
          </span>
        </div>

        {/* Global Toolbar / Transport */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPlaying 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {isPlaying ? '⏸️ PAUSE AUDIO' : '▶️ START AUDIO WORKLET'}
          </button>

          {/* Preset / Patch selector badge */}
          <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1 rounded border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">PATCH:</span>
            <span className="text-cyan-400 font-bold">{activePatch}</span>
          </div>

          <button
            onClick={() => setIsNewPatchModalOpen(true)}
            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded text-xs font-mono font-semibold flex items-center gap-1 transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Preset</span>
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#0b0f19] p-1 rounded-md border border-[#202b46]">
          <Link href="/" className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white rounded hover:bg-slate-800 transition">
            ✏️ Editor Visual
          </Link>
          <span className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded shadow-sm">
            🎛️ Showcase Player
          </span>
        </div>
      </header>

      {/* Main Synthesizer Rack Area */}
      <main className="flex-1 p-6 overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          
          {/* Rack Header Info */}
          <div className="flex justify-between items-center bg-[#131b2e] p-4 rounded-xl border border-[#202b46]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Visual Module Showcase (Rack Player)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Bastidor modular en tiempo real. Añade módulos desde la biblioteca o prueba patches WASM.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModuleModalOpen(true)}
                className="px-3 py-1.5 bg-cyan-500 text-black hover:bg-cyan-400 rounded text-xs font-bold font-mono flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>AÑADIR MÓDULO AL RACK</span>
              </button>
              
              <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                MÓDULOS: {rackModuleIds.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-cyan-400 font-mono text-xs animate-pulse">
              LOADING MODULE REPRESENTATIONS...
            </div>
          ) : rackModuleIds.length === 0 ? (
            /* Empty Rack Placeholder */
            <div className="h-72 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 bg-[#0d1322]/50 text-slate-500">
              <p className="text-sm font-mono font-semibold">El bastidor está vacío</p>
              <button
                onClick={() => setIsAddModuleModalOpen(true)}
                className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir primer módulo</span>
              </button>
            </div>
          ) : (
            /* Dynamic Module Rack Grid containing actual rendered modules */
            <div className="flex flex-wrap gap-8 items-start justify-start">
              {rackModuleIds.map((modId: string, index: number) => {
                const modEntry = catalogModules.find(m => m.id === modId);
                const manifest = manifests[modId];
                if (!manifest || !manifest.ui?.tree) return null;

                const hp = (manifest.metadata as any)?.rack?.hp || (manifest.metadata as any)?.hp || modEntry?.hpWidth || 8;
                const widthPx = Math.max(hp * 15, 60);

                return (
                  <div 
                    key={`${modId}-${index}`}
                    className="bg-[#131b2e] border border-[#202b46] rounded-xl p-4 flex flex-col gap-3 shadow-xl hover:border-cyan-500/40 transition relative group"
                  >
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-cyan-400">{manifest.metadata?.name || modEntry?.name || modId}</span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {modId} • {hp} HP</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveModuleFromRack(index)}
                          title="Quitar del rack"
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Render OK
                        </span>
                      </div>
                    </div>

                    {/* Unified graphical representation */}
                    <div 
                      className="relative border border-slate-700/50 bg-[#0a0e17] rounded-lg overflow-hidden select-none mx-auto flex items-start justify-start"
                      style={{ width: `${widthPx}px`, height: `${manifest.ui?.dimensions?.height || 420}px` }}
                    >
                      <UniversalRenderer 
                        node={manifest.ui.tree}
                        manifest={manifest}
                        catalog={manifest.moduleTemplates || {}}
                        debugContext={{
                          enabled: false,
                          showLabels: false,
                          hideDecorative: false,
                          isLiveMode: true,
                          runtimeValues: {},
                          selectedId: null,
                          multiSelectedIds: [],
                          onSelect: () => {},
                          zoom: 1
                        }}
                      />
                    </div>

                    <div className="bg-[#0b0f19] p-2.5 rounded-lg flex justify-between items-center border border-slate-800/80 mt-1">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">Ports: <strong className="text-white">{modEntry?.portsCount ?? 2}</strong></span>
                        <span className="text-[10px] text-slate-400 font-mono">Controls: <strong className="text-white">{modEntry?.controlsCount ?? 2}</strong></span>
                      </div>
                      <Link 
                        href={`/en/editor?module=${modId}`}
                        className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 rounded text-[9px] font-bold tracking-wider transition font-mono"
                      >
                        ✏️ EDIT MANIFEST
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* --- MODAL: AÑADIR MÓDULO AL RACK --- */}
      {isAddModuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-[#202b46] rounded-2xl w-full max-w-xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-cyan-400 font-mono tracking-wide flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>SELECCIONAR MÓDULO PARA EL RACK</span>
              </h3>
              <button 
                onClick={() => setIsAddModuleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {catalogModules.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleAddModuleToRack(entry.id)}
                  className="flex flex-col gap-1 p-3 bg-[#0b0f19] border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 rounded-xl text-left transition group cursor-pointer"
                >
                  <span className="font-mono text-xs font-bold text-white group-hover:text-cyan-400 transition">
                    {entry.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {entry.id} • {entry.hpWidth} HP
                  </span>
                  {entry.description && (
                    <span className="text-[9px] text-slate-500 line-clamp-2 mt-1">
                      {entry.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREAR NUEVO PRESET --- */}
      {isNewPatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-[#202b46] rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-cyan-400 font-mono tracking-wide flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                <span>CREAR NUEVO PRESET / RACK PATCH</span>
              </h3>
              <button 
                onClick={() => setIsNewPatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-mono">Nombre del Preset / Patch:</label>
              <input 
                type="text"
                value={newPatchName}
                onChange={(e) => setNewPatchName(e.target.value)}
                placeholder="ej. Ambient Drone Patch 01"
                className="bg-[#0b0f19] border border-slate-800 focus:border-cyan-500 text-white font-mono text-xs px-3 py-2 rounded-lg outline-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsNewPatchModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewPatch}
                disabled={!newPatchName.trim()}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold font-mono text-xs rounded transition"
              >
                Crear Patch
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
