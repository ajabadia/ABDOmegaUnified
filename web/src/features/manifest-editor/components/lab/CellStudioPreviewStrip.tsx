'use client';

/**
 * @purpose Renderiza una sección de previsualización con contenido HTML real tiempo y un deslizante para ajustar valores de comportamiento.
 * @purpose_en Renders a preview strip with real-time HTML content and a scrubber to adjust behavior values.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1redw2o
 * @lastUpdated 2026-06-20T09:18:51.208Z
 */

import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import DOMPurify from 'dompurify';

interface CellStudioPreviewStripProps {
  previewHTML: string;
  testValue: number;
  onScrub: (value: number) => void;
  onReset: () => void;
}

/**
 * CellStudioPreviewStrip — Left panel with real-time preview and behavior scrubber.
 */
export function CellStudioPreviewStrip({
  previewHTML,
  testValue,
  onScrub,
  onReset
}: CellStudioPreviewStripProps) {
  const sanitizedHTML = useMemo(() => {
    if (typeof window === 'undefined') return previewHTML;
    return DOMPurify.sanitize(previewHTML);
  }, [previewHTML]);

  return (
    <div className="w-80 md:w-96 border-r wb-outline wb-surface-subtle flex flex-col relative overflow-hidden shrink-0">
      <div className="p-4 border-b wb-outline wb-surface-subtle flex items-center justify-between shrink-0">
        <span className="text-[8px] font-black uppercase tracking-widest wb-text-muted">Cell Preview</span>
      </div>

      <div className="flex-1 flex items-center justify-center relative bg-[radial-gradient(circle_at_center,_#111_0%,_transparent_70%)] group">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <div className={`scale-[1.2] relative transition-all duration-700 ${testValue !== 0.75 ? 'drop-shadow-[0_0_30px_rgba(0,242,255,0.2)]' : ''}`}>
          <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
        </div>

        <div className="absolute bottom-4 left-4 right-4 wb-surface-inset border wb-outline p-3 rounded-xs flex flex-col gap-2 opacity-80 hover:opacity-100 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[6px] font-black uppercase tracking-widest text-accent flex items-center gap-1">
              <Activity className={`w-2.5 h-2.5 ${testValue !== 0.75 ? 'animate-pulse' : ''}`} /> Behavior Scrubber
            </span>
            <div className="flex items-center gap-3">
              <button onClick={onReset} title="Reset behavior value" className="text-[6px] font-black uppercase text-white/20 hover:text-white/60 cursor-pointer">RESET</button>
              <span className="text-[7px] font-mono text-white/40">{(testValue * 100).toFixed(1)}%</span>
            </div>
          </div>
          <input
            type="range" min="0" max="1" step="0.001"
            value={testValue}
            onChange={(e) => onScrub(parseFloat(e.target.value))}
            aria-label="Behavior scrubber"
            className="w-full h-1 bg-white/10 rounded-full appearance-none accent-accent cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
