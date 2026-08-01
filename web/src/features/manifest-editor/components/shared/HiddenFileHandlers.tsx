'use client';

/**
 * @purpose Gestiona subidas de archivos para recursos en el editor de manifesto OMEGA, proporcionando una interfaz limpia para que los usuarios seleccional y suban archivos sin contaminar la consola de trabajo principal.
 * @purpose_en Manages file uploads for resources in the OMEGA manifest editor, providing a clean interface for users to select and upload files without cluttering the main workbench.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:1nhoad2
 * @lastUpdated 2026-06-20T09:44:14.051Z
 */

import React from 'react';

interface HiddenFileHandlersProps {
  onResourceUpload: (files: FileList | File[]) => Promise<string>;
  setPendingFiles: (files: File[]) => void;
}

/**
 * HiddenFileHandlers (v7.2.3)
 * Isolates invisible file input infrastructure to keep the main workbench clean.
 */
export const HiddenFileHandlers = ({ 
  onResourceUpload, 
  setPendingFiles 
}: HiddenFileHandlersProps) => {
  // Direct Upload Bridge (Aseptic Global)
  React.useEffect(() => {
    const bridge = async (file: File | File[], onDone?: (id: string) => void) => {
      const files = Array.isArray(file) ? file : [file];
      const assetId = await onResourceUpload(files);
      if (onDone && assetId) onDone(assetId);
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).triggerAssetUpload = bridge;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (window as any).triggerAssetUpload; };
  }, [onResourceUpload]);

  return (
    <>
      <input 
        id="bulk-upload" 
        type="file" 
        accept=".acemm,.wasm,.ace,.json" 
        multiple 
        className="hidden" 
        aria-label="Upload manifest, WASM or JSON files"
        onChange={(e) => { 
          if (e.target.files) { 
            setPendingFiles(Array.from(e.target.files)); 
            e.target.value = ''; 
          } 
        }} 
      />
      <input 
        id="folder-upload" 
        type="file" 
        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement> & { webkitdirectory: string; directory: string })}
        className="hidden" 
        aria-label="Upload module folder"
        onChange={(e) => { 
          if (e.target.files) { 
            setPendingFiles(Array.from(e.target.files)); 
            e.target.value = ''; 
          } 
        }} 
      />
      <input 
        id="resource-upload" 
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        aria-label="Upload image resources"
        onChange={(e) => { 
          if (e.target.files) { 
            onResourceUpload(e.target.files); 
            e.target.value = ''; 
          } 
        }} 
      />
    </>
  );
};
