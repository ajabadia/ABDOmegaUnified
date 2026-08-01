'use client';

/**
 * @purpose Gestiona y muestra una lista de recursos en el editor de manifesto OMEGA, permitiendo a los usuarios subir, preview y eliminar activos.
 * @purpose_en Manages and displays a list of resources in the OMEGA manifest editor, allowing users to upload, preview, and delete assets.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:9,sig:7wia5l
 * @lastUpdated 2026-06-20T09:17:08.495Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Plus, Trash2, FileImage, Globe, ShieldCheck, Folder, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import type { ExtraResource } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '../shared/InspectorCollapsible';
import IndustrialButton from '../shared/IndustrialButton';
import EmptyState from '../shared/EmptyState';
import InfoBlock from '../shared/InfoBlock';
 
interface ResourceSectionProps {
  resources: ExtraResource[];
  onTriggerUpload: (() => void) | undefined;
  onRemove?: ((name: string) => void) | undefined;
}
 
interface ResourceItemProps {
  res: ExtraResource;
  idx: number;
  onRemove?: ((name: string) => void) | undefined;
}
 
const ResourceItem = React.memo(({ res, idx, onRemove }: ResourceItemProps) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
 
  React.useEffect(() => {
    if (!res.type.startsWith('image/')) return;
    
    const blob = new Blob([res.data], { type: res.type });
    const url = URL.createObjectURL(blob);
    const timer = setTimeout(() => setPreviewUrl(url), 0);
 
    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [res.data, res.type]);
 
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="group p-3 bg-white/2 border border-outline/10 rounded-sm hover:border-primary/20 transition-all flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 bg-black/40 border border-outline/20 rounded-xs flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <Image 
              src={previewUrl} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              alt={res.name}
              fill
              unoptimized
            />
          ) : (
            <FileImage className="w-4 h-4 text-foreground/20" />
          )}
        </div>
        <div>
          <p className="text-[9px] font-black text-foreground/70 group-hover:text-primary transition-colors truncate max-w-[120px]">
            {res.name}
          </p>
          <p className="text-[7px] font-mono text-foreground/30 uppercase tracking-tighter">
            {Math.round(res.data.byteLength / 1024)} KB • {res.type.split('/')[1]}
          </p>
        </div>
      </div>
 
      <div className="flex items-center gap-2">
        {res.name.toLowerCase().includes('skin') && (
          <div className="px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded-xs flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5 text-accent" />
            <span className="text-[6px] font-black uppercase text-accent">Active Skin</span>
          </div>
        )}
        <button 
          onClick={() => onRemove?.(res.name)}
          aria-label={`Delete ${res.name}`}
          className="p-1.5 hover:bg-red-500/10 rounded-xs text-foreground/20 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
});
ResourceItem.displayName = 'ResourceItem';
 
export default function ResourceSection({ resources, onTriggerUpload, onRemove }: ResourceSectionProps) {
  const [currentPath, setCurrentPath] = React.useState<string | null>(null);

  // VIRTUAL FILE SYSTEM LOGIC
  const folders = React.useMemo(() => {
    const map = new Map<string, ExtraResource[]>();
    resources.forEach(res => {
      const parts = res.name.split('/');
      if (parts.length > 1) {
        const folderName = parts[0];
        if (!map.has(folderName)) map.set(folderName, []);
        map.get(folderName)?.push(res);
      } else {
        if (!map.has('root')) map.set('root', []);
        map.get('root')?.push(res);
      }
    });
    return map;
  }, [resources]);


  const rootItems = folders.get('root') || [];

  return (
    <div className="space-y-4 pt-2">
      <InspectorCollapsible 
        title="Industrial Asset Registry" 
        icon={ImageIcon}
      >
        <div className="space-y-4 pt-2">
          {/* VFS BREADCRUMBS & OPS */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
               {currentPath && (
                 <button 
                   onClick={() => setCurrentPath(null)}
                   aria-label="Go back to root folder"
                   className="p-1.5 bg-accent/5 border border-accent/20 rounded-xs transition-all hover:bg-accent/10 flex items-center gap-1 text-[8px] font-black uppercase text-accent group"
                 >
                   <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                   Root
                 </button>
               )}
               <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  <Globe className="w-3 h-3 opacity-20" />
                  <span className="opacity-40">Registry</span>
                  {currentPath && (
                    <>
                      <span className="opacity-10">/</span>
                      <span className="text-accent bg-accent/10 px-1.5 py-0.5 rounded-xs">{currentPath}</span>
                    </>
                  )}
               </div>
            </div>
            <IndustrialButton 
              label="Ingest Asset"
              icon={Plus}
              onClick={onTriggerUpload}
              variant="primary"
              size="sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 px-1">
            {resources.length === 0 ? (
              <EmptyState 
                message="No Assets Ingested"
                subMessage="Resources will be categorized in the VFS"
                icon={FileImage}
              />
            ) : (
              <>
                {/* INDUSTRIAL FOLDERS */}
                {!currentPath && Array.from(folders.keys()).filter(k => k !== 'root').map(folderName => (
                  <button
                    key={folderName}
                    onClick={() => setCurrentPath(folderName)}
                    aria-label={`Open folder ${folderName}`}
                    className="p-3 bg-black/40 border wb-outline rounded-sm hover:border-accent/40 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-accent/5 border border-accent/20 rounded-xs flex items-center justify-center">
                         <Folder className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-left space-y-0.5">
                        <p className="text-[10px] font-black text-foreground/80 uppercase tracking-widest">{folderName}</p>
                        <p className="text-[7px] font-bold text-accent/40 uppercase tracking-tighter">
                          {folders.get(folderName)?.length} Industrial Objects
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {/* VIRTUAL ITEMS */}
                {currentPath ? (
                  folders.get(currentPath)?.map((res, idx) => (
                    <ResourceItem 
                      key={res.name} 
                      res={res} 
                      idx={idx} 
                      onRemove={onRemove} 
                    />
                  ))
                ) : (
                  rootItems.map((res, idx) => (
                    <ResourceItem 
                      key={res.name} 
                      res={res} 
                      idx={idx} 
                      onRemove={onRemove} 
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </InspectorCollapsible>

      <InfoBlock 
        title="Industrial Storage"
        icon={Globe}
        message="Governance Rule: Categorize assets using '/' in filenames (e.g. 'branding/logo.svg')."
        variant="muted"
        className="mt-6"
      />
    </div>
  );
}
