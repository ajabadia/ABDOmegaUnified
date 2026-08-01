'use client';

/**
 * @purpose Gestiona el consumo y secuenciación de archivos para crear cintas de film industriales en el editor de manifesto OMEGA.
 * @purpose_en Manages the ingestion and sequencing of files to create industrial-grade filmstrips in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:n97hvv
 * @lastUpdated 2026-06-20T09:17:51.149Z
 */

import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowDown, MoveUp, MoveDown, Check, AlertCircle, RefreshCw } from 'lucide-react';

import type { OmegaStyleNode } from '@/types/manifest';

interface SequenceIngestionLabProps {
  files: File[];
  onComplete: (stitchedBlob: Blob, metadata: Partial<OmegaStyleNode>) => void;
  onCancel: (() => void) | undefined;
}

export default function SequenceIngestionLab({ files, onComplete, onCancel }: SequenceIngestionLabProps) {
  const [orderedFiles, setOrderedFiles] = useState<File[]>([]);
  const [orientation, setOrientation] = useState<'v' | 'h'>('v');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initial sort
  useEffect(() => {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    requestAnimationFrame(() => setOrderedFiles(sorted));
  }, [files]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...orderedFiles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    setOrderedFiles(newFiles);
  };

  const handleStitch = async () => {
    if (orderedFiles.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Load all images to get dimensions
      const images = await Promise.all(orderedFiles.map(file => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
      }));

      // 2. Assume all frames have same size as first frame
      const frameW = images[0].width;
      const frameH = images[0].height;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const totalW = orientation === 'h' ? frameW * images.length : frameW;
      const totalH = orientation === 'v' ? frameH * images.length : frameH;

      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 3. Draw each frame
      images.forEach((img, i) => {
        const x = orientation === 'h' ? i * frameW : 0;
        const y = orientation === 'v' ? i * frameH : 0;
        ctx.drawImage(img, x, y);
        URL.revokeObjectURL(img.src); // Cleanup
      });

      // 4. Export to blob
      canvas.toBlob((blob) => {
        if (blob) {
          onComplete(blob, {
            frames: images.length,
            frameWidth: frameW,
            frameHeight: frameH,
            orientation: orientation,
            category: 'knob' // Default, can be changed later in inspector
          });
        }
        setIsProcessing(false);
      }, 'image/png');

    } catch (err) {
      console.error("Stitching failed:", err);
      setIsProcessing(false);
      alert("Failed to process images. Ensure they are valid graphic files.");
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
      <div className="bg-[#111] border border-white/10 rounded-xs w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center border border-accent/20 text-accent">
              <RefreshCw className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white italic">Sequence Stretcher Lab</h2>
              <p className="text-[9px] font-bold uppercase text-white/20 tracking-[0.3em]">Industrial Ingestion Pipeline / Era 7.2.4</p>
            </div>
          </div>
          <button onClick={onCancel} aria-label="Cancel ingestion" className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden flex">
          {/* FILE LIST & ORDERING */}
          <div className="w-1/2 border-r border-white/5 flex flex-col bg-black/20">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
               <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Payload: {orderedFiles.length} Frames</span>
               <div className="flex gap-1">
                 <button 
                  onClick={() => setOrientation('v')}
                  aria-label="Set vertical orientation"
                  className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${orientation === 'v' ? 'bg-accent text-black' : 'bg-white/5 text-white/40'}`}
                 >
                   Vertical
                 </button>
                 <button 
                  onClick={() => setOrientation('h')}
                  aria-label="Set horizontal orientation"
                  className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${orientation === 'h' ? 'bg-accent text-black' : 'bg-white/5 text-white/40'}`}
                 >
                   Horizontal
                 </button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
              {orderedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white/[0.03] border border-white/5 rounded-xs hover:bg-white/10 transition-all group">
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-white/20">{String(i + 1).padStart(3, '0')}</span>
                      <span className="text-[10px] font-mono text-accent truncate max-w-[200px]">{file.name}</span>
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveItem(i, 'up')} title="Move frame up" aria-label="Move frame up" className="p-1 hover:bg-accent/20 rounded text-white/40 hover:text-accent"><MoveUp className="w-3 h-3" /></button>
                      <button onClick={() => moveItem(i, 'down')} title="Move frame down" aria-label="Move frame down" className="p-1 hover:bg-accent/20 rounded text-white/40 hover:text-accent"><MoveDown className="w-3 h-3" /></button>
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* PREVIEW & SUMMARY */}
          <div className="w-1/2 p-8 flex flex-col items-center justify-center gap-8 bg-black/40">
              <div className="w-64 h-64 border border-dashed border-white/10 rounded flex items-center justify-center relative overflow-hidden bg-black/60 group">
                {orderedFiles.length > 0 && (
                  <div className="text-center p-6">
                    {orientation === 'v' ? <ArrowDown className="w-8 h-8 text-accent mx-auto mb-4 animate-bounce" /> : <ArrowRight className="w-8 h-8 text-accent mx-auto mb-4 animate-bounce" />}
                    <span className="text-[10px] font-black uppercase text-white/60 tracking-widest block">Stitching Logic Ready</span>
                    <span className="text-[8px] font-bold text-white/20 block mt-2 italic">Format: PNG Lossless / RGBA</span>
                  </div>
                )}
                {/* Hidden processing overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                     <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                     <span className="text-[10px] font-black uppercase text-accent tracking-tighter">Fusing Assets...</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 w-full max-w-xs">
                <div className="p-4 bg-accent/5 border border-accent/10 rounded flex gap-4">
                   <AlertCircle className="w-5 h-5 text-accent shrink-0" />
                   <p className="text-[9px] text-accent/80 font-bold leading-relaxed uppercase">
                     The lab will automatically generate an industrial-grade filmstrip. Ensure all frames share the same dimensions.
                   </p>
                </div>
                
                <button
                  onClick={handleStitch}
                  disabled={isProcessing || orderedFiles.length === 0}
                  aria-label="Fuse frames into sequence"
                  className="w-full py-4 bg-accent text-black font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all disabled:opacity-20 disabled:grayscale"
                >
                  <Check className="w-5 h-5" />
                  Fuse into Sequence
                </button>
              </div>
          </div>
        </div>

        {/* HIDDEN CANVAS */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
