/**
 * @purpose Renderiza una interfaz de usuario para editar recetas de capas en un editor de manifesto OMEGA, permitiendo a los usuarios agregar, eliminar, reordenar y modificar capas.
 * @purpose_en Renders a user interface for editing layer recipes in an OMEGA manifest editor, allowing users to add, remove, reorder, and modify layers.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:1mus1d5
 * @lastUpdated 2026-06-20T09:39:57.526Z
 */

import type { LayerRecipe, LayerRecipeItem } from '@/omega-ui-core/types/assetBehavior';
import { Target, Layers, Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Trash2, Image as ImageIcon, Plus } from 'lucide-react';
 
interface LayerRecipeEditorProps {
  recipe: LayerRecipe;
  onChange: (updates: Partial<LayerRecipe>) => void;
  onSelectAsset: (layerId: string) => void;
  soloLayerId?: (string | null) | undefined;
  onSoloChange?: ((id: string | null) => void) | undefined;
}
 
export default function LayerRecipeEditor({ 
  recipe, onChange, onSelectAsset, soloLayerId, onSoloChange 
}: LayerRecipeEditorProps) {
 
  const addLayer = () => {
    const newLayer: LayerRecipeItem = {
      id: `layer_${Date.now()}`,
      name: `New Layer ${recipe.layers.length + 1}`,
      role: 'overlay',
      assetId: '',
      assetType: 'static',
      zIndex: recipe.layers.length,
      visible: true,
      opacity: 1
    };
    onChange({ layers: [...recipe.layers, newLayer] });
  };
 
  const updateLayer = (id: string, updates: Partial<LayerRecipeItem>) => {
    onChange({
      layers: recipe.layers.map(l => l.id === id ? { ...l, ...updates } : l)
    });
  };
 
  const removeLayer = (id: string) => {
    onChange({ layers: recipe.layers.filter(l => l.id !== id) });
  };
 
  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const newLayers = [...recipe.layers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLayers.length) return;
 
    const [moved] = newLayers.splice(index, 1);
    newLayers.splice(targetIndex, 0, moved);
    
    // Update z-indices based on new order
    onChange({ 
      layers: newLayers.map((l, i) => ({ ...l, zIndex: i }))
    });
  };
 
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Layer Composition Recipe</h3>
        </div>
        <button 
          onClick={addLayer}
          aria-label="Add new layer"
          title="Add new layer"
          className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/30 rounded text-[8px] font-black uppercase text-accent hover:bg-accent/20 transition-all"
        >
          <Plus className="w-3 h-3" /> Add Layer
        </button>
      </div>
 
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {recipe.layers.length === 0 && (
          <div className="p-8 border border-dashed border-[#333] rounded-lg text-center">
            <p className="text-[8px] font-bold uppercase opacity-30">No layers defined in recipe.</p>
          </div>
        )}
 
        {recipe.layers.map((layer, index) => (
          <div 
            key={layer.id}
            className={`bg-[#111112] border rounded-lg p-3 flex items-center gap-4 group transition-all hover:border-[#444] ${soloLayerId === layer.id ? 'border-accent shadow-[0_0_15px_rgba(0,242,255,0.1)]' : 'border-[#222]'} ${soloLayerId && soloLayerId !== layer.id ? 'opacity-40 grayscale' : ''}`}
          >
            {/* DRAG / REORDER */}
            <div className="flex flex-col gap-1">
              <button 
                disabled={index === 0}
                onClick={() => moveLayer(index, 'up')}
                aria-label="Move layer up"
                title="Move layer up"
                className="p-1 hover:bg-accent/20 rounded text-white/10 hover:text-accent disabled:opacity-0 transition-all"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button 
                disabled={index === recipe.layers.length - 1}
                onClick={() => moveLayer(index, 'down')}
                aria-label="Move layer down"
                title="Move layer down"
                className="p-1 hover:bg-accent/20 rounded text-white/10 hover:text-accent disabled:opacity-0 transition-all"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
 
            {/* LAYER ICON / VISIBILITY */}
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                className={`p-1.5 rounded-full transition-all ${layer.visible ? 'text-accent bg-accent/5' : 'text-white/20'}`}
              >
                {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button 
                onClick={() => onSoloChange?.(soloLayerId === layer.id ? null : layer.id)}
                aria-label="Solo layer"
                className={`p-1.5 rounded-full transition-all ${soloLayerId === layer.id ? 'text-accent bg-accent/20 font-black' : 'text-white/20 hover:text-accent/40'}`}
                title="Solo Layer"
              >
                <Target className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
                aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                className={`p-1.5 rounded-full transition-all ${layer.locked ? 'text-amber-500 bg-amber-500/5' : 'text-white/20'}`}
              >
                {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>
 
            {/* LAYER DETAILS */}
            <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={layer.name}
                        onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                        className="bg-transparent border-b border-transparent focus:border-accent/40 text-[9px] font-black uppercase text-white outline-none w-32"
                        aria-label="Layer name"
                      />
                      <span className={`text-[6px] font-black uppercase px-1.5 py-0.5 rounded ${
                        layer.role === 'base' ? 'bg-accent text-black' : 
                        layer.role === 'mask' ? 'bg-red-500/20 text-red-400' :
                        'bg-white/10 text-white/40'
                      }`}>
                        {layer.role}
                      </span>
                    </div>
                    <select 
                      value={layer.role}
                      onChange={(e) => updateLayer(layer.id, { role: e.target.value as LayerRecipeItem['role'] })}
                      className="bg-[#1a1a1b] border border-[#333] rounded px-2 py-0.5 text-[7px] font-black uppercase text-white/60 outline-none"
                    >
                  <option value="base">Base</option>
                  <option value="overlay">Overlay</option>
                  <option value="indicator">Indicator</option>
                  <option value="glare">Glare</option>
                  <option value="mask">Mask</option>
                  <option value="decor">Decor</option>
                </select>
                <div className="flex-1" />
                <button 
                  onClick={() => onSelectAsset(layer.id)}
                  aria-label="Select layer asset"
                  title="Select layer asset"
                  className={`flex items-center gap-2 px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${layer.assetId ? 'bg-white/5 border border-white/10 text-white' : 'bg-accent/10 border border-accent/20 text-accent animate-pulse'}`}
                >
                  <ImageIcon className="w-3 h-3" />
                  {layer.assetId ? layer.assetId.split('/').pop() : 'Select Asset'}
                </button>
              </div>
 
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[6px] font-black uppercase opacity-30">Opacity</span>
                  <input 
                    type="range" min="0" max="1" step="0.01"
                    value={layer.opacity ?? 1}
                    onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                    className="flex-1 accent-accent h-1 bg-white/5 rounded-full appearance-none"
                    aria-label="Layer opacity"
                  />
                  <span className="text-[6px] font-mono opacity-40 w-6">{( (layer.opacity ?? 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-32 flex items-center gap-2">
                  <span className="text-[6px] font-black uppercase opacity-30">Blend</span>
                  <select 
                    value={layer.blendMode ?? 'normal'}
                    onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value as 'normal' | 'multiply' | 'screen' | 'overlay' })}
                    className="flex-1 bg-[#0a0a0b] border border-[#222] rounded px-2 py-0.5 text-[7px] font-black uppercase text-white/40 outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="multiply">Multiply</option>
                    <option value="screen">Screen</option>
                    <option value="overlay">Overlay</option>
                  </select>
                </div>
              </div>
            </div>
 
            {/* DELETE */}
            <button 
              onClick={() => removeLayer(layer.id)}
              aria-label="Delete layer"
              title="Delete layer"
              className="p-2 hover:bg-red-500/10 rounded-full text-white/10 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-white/5 rounded-lg border border-white/10">
        <p className="text-[8px] font-bold uppercase opacity-30 leading-relaxed">
          Z-Order is determined by the list sequence. The bottom layer in the list renders on top.
        </p>
      </div>
    </div>
  );
}
