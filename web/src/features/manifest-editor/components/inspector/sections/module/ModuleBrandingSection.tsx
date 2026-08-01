'use client';

/**
 * @purpose Gestiona la sección de branding e imágenes (logotipos) de un módulo en el inspector OMEGA.
 * @purpose_en Manages the branding and logo assets section for a module in the OMEGA inspector.
 * @classification UI Component
 * @complexity Low
 */

import React from 'react';
import { Box, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import type { OMEGA_Manifest, ManifestMetadata } from '@/omega-ui-core/types/manifest';
import AssetSelector from '@/features/manifest-editor/components/inspector/shared/AssetSelector';

interface ModuleBrandingSectionProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
}

export default function ModuleBrandingSection({ manifest, onUpdate, resolveAsset }: ModuleBrandingSectionProps) {
  const metadata = manifest.metadata || {};
  const [copied, setCopied] = React.useState(false);

  const updateMetadata = (field: keyof ManifestMetadata, value: unknown) => {
    onUpdate({ metadata: { ...metadata, [field]: value } } as Partial<OMEGA_Manifest>);
  };

  const handleCopyId = () => {
    if (metadata.icon) {
      navigator.clipboard.writeText(metadata.icon).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Brand Badge Card */}
      <div className="flex gap-3 p-3 wb-surface-strong border wb-outline rounded-xs items-center">
        <div
          className="w-14 h-14 wb-surface-inset border wb-outline rounded-xs flex items-center justify-center overflow-hidden relative group shrink-0"
          style={{
            backgroundImage: [
              'linear-gradient(var(--wb-outline) 1px, transparent 1px)',
              'linear-gradient(90deg, var(--wb-outline) 1px, transparent 1px)'
            ].join(', '),
            backgroundSize: '8px 8px'
          }}
        >
          {metadata.icon ? (
            <div className="w-full h-full p-1.5 flex items-center justify-center">
              <Image
                src={resolveAsset(metadata.icon) || ''}
                fill
                unoptimized
                className="p-1 object-contain group-hover:scale-105 transition-transform duration-300"
                alt="Module Logo"
              />
            </div>
          ) : (
            <Box className="w-5 h-5 wb-text-muted opacity-30" />
          )}
        </div>

        <div className="flex-grow min-w-0 space-y-1.5">
          <div>
            <span className="text-[6px] font-black uppercase wb-text-muted tracking-widest block">Logo Asset ID</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[8px] font-mono font-bold wb-text truncate block leading-none select-all flex-1">
                {metadata.icon || '—'}
              </span>
              {metadata.icon && (
                <button
                  onClick={handleCopyId}
                  className="shrink-0 p-0.5 wb-text-muted hover:text-primary transition-colors"
                  title="Copy asset ID"
                >
                  {copied
                    ? <Check className="w-3 h-3 text-green-500" />
                    : <Copy className="w-3 h-3" />
                  }
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-[6px] wb-text-muted uppercase font-bold leading-none block">
              SVG or transparent PNG · shown in catalog &amp; presets
            </span>
          </div>
        </div>
      </div>

      {/* Asset Selector */}
      <div className="border-t wb-outline pt-3">
        <AssetSelector
          manifest={manifest}
          selectedAssetId={metadata.icon}
          onSelect={(id) => updateMetadata('icon', id)}
          resolveAsset={resolveAsset}
          label="Available Branding Assets"
        />
      </div>
    </div>
  );
}
