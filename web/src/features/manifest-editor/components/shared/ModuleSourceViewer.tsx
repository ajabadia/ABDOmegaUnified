'use client';

/**
 * @purpose Muestra el código fuente C++ de un módulo de la estantería (/modules) en un modal.
 * @purpose_en Displays a shelf module's C++ source code (/modules) in a modal.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 */

import { useEffect, useState, useCallback } from 'react';
import { Copy, Check, X, FileCode, Loader2, AlertTriangle } from 'lucide-react';
import { SharedModuleCatalogService } from '@/services/sharedModuleCatalog';
import type { SharedModuleEntry } from '@/services/sharedModuleCatalog';

interface ModuleSourceViewerProps {
  onRequestClose?: () => void;
}

export function ModuleSourceViewer({ onRequestClose }: ModuleSourceViewerProps) {
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [entry, setEntry] = useState<SharedModuleEntry | null>(null);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setModuleId(null);
    setEntry(null);
    setSource('');
    setError('');
    onRequestClose?.();
  }, [onRequestClose]);

  const openModule = useCallback(async (id: string) => {
    const found = SharedModuleCatalogService.getModuleById(id);
    if (!found) {
      setError(`Module "${id}" not found in shared catalog`);
      setModuleId(id);
      setEntry(null);
      setSource('');
      setOpen(true);
      return;
    }
    setModuleId(found.id);
    setEntry(found);
    setError('');
    setSource('');
    setOpen(true);
    if (!found.hasSource) {
      setError(`No source (.cpp) available for module "${found.id}"`);
      return;
    }
    setLoading(true);
    try {
      setSource(await SharedModuleCatalogService.fetchSource(found.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load source for "${found.id}"`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (window as unknown as { __omegaViewModuleSource?: (id: string) => void }).__omegaViewModuleSource = openModule;
    return () => {
      const w = window as unknown as { __omegaViewModuleSource?: (id: string) => void };
      if (w.__omegaViewModuleSource === openModule) {
        delete w.__omegaViewModuleSource;
      }
    };
  }, [openModule]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const handleCopy = async () => {
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="flex flex-col w-full max-w-3xl max-h-[85vh] rounded-lg overflow-hidden"
        style={{
          background: '#0e0e0f',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(0,240,255,0.15)',
          boxShadow: '0 0 40px rgba(0,240,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <FileCode className="w-4 h-4 text-[#00f0ff] shrink-0" />
            <h2 className="text-sm font-semibold tracking-wide text-[#00f0ff] truncate">
              {moduleId ?? 'Module Source'} <span className="text-[10px] font-normal text-[#888]">(.cpp)</span>
            </h2>
            {entry && (
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: 'rgba(0,240,255,0.12)', color: '#00f0ff' }}>
                {entry.family}
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-70"
            style={{ color: '#888' }}
            aria-label="Close source viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta strip */}
        {entry && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <span className="text-[10px] text-[#777]">v{entry.version}</span>
            <span className="text-[10px] text-[#777]">{entry.hpWidth} HP</span>
            <span className="text-[10px] text-[#777]">{entry.controlsCount} controls</span>
            <span className="text-[10px] text-[#777]">{entry.portsCount} ports</span>
            {entry.description && (
              <span className="text-[10px] text-[#777] truncate flex-1 min-w-[120px]">{entry.description}</span>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto p-4" style={{ background: '#0a0a0a' }}>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#00f0ff]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading {moduleId}/{moduleId}.cpp…
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 text-xs text-[#ff5555]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && (
            <pre className="text-[11px] font-mono text-primary/80 overflow-x-auto whitespace-pre leading-relaxed selection:bg-primary/20 selection:text-primary">
              {source}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-2 px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleCopy}
            disabled={!source}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#ccc' }}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={close}
            className="text-xs px-4 py-1.5 rounded transition-colors"
            style={{ background: '#00f0ff', color: '#0e0e0f', fontWeight: 600 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
