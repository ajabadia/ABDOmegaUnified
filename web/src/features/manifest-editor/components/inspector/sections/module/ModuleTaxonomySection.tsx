'use client';

/**
 * @purpose Gestiona la sección de taxonomía, familias y tags de un módulo en el inspector OMEGA.
 * @purpose_en Manages the taxonomy, family, and tags section for a module in the OMEGA inspector.
 * @classification UI Component
 * @complexity Low
 */

import type { OMEGA_Manifest, ManifestMetadata } from '@/omega-ui-core/types/manifest';
import PropertyField from '../../PropertyField';
import { IndustrialInput } from '@/features/manifest-editor/components/primitives/IndustrialInput';

const SUGGESTED_TAGS = ['ANALOG', 'VIRTUAL', 'POLYPHONIC', 'VCF', 'VCO', 'LFO', 'ENVELOPE', 'UTILITY', 'FX'];

interface ModuleTaxonomySectionProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
}

export default function ModuleTaxonomySection({ manifest, onUpdate }: ModuleTaxonomySectionProps) {
  const metadata = manifest.metadata || {};
  const currentTags = metadata.tags || [];

  const updateMetadata = (field: keyof ManifestMetadata, value: unknown) => {
    onUpdate({ metadata: { ...metadata, [field]: value } } as Partial<OMEGA_Manifest>);
  };

  const toggleTag = (tag: string) => {
    const lower = tag.toLowerCase();
    const exists = currentTags.some((t: string) => t.toLowerCase() === lower);
    const next = exists ? currentTags.filter((t: string) => t.toLowerCase() !== lower) : [...currentTags, tag];
    updateMetadata('tags', next);
  };

  return (
    <div className="space-y-3">
      {/* Taxonomy fields */}
      <div className="grid grid-cols-2 gap-3">
        <PropertyField label="Primary Family" helper="VCF, OSC, UTILITY…">
          <IndustrialInput
            value={metadata.family || ''}
            onChange={(v) => updateMetadata('family', v)}
            placeholder="e.g. VCF"
          />
        </PropertyField>

        <PropertyField label="Creator / Author">
          <IndustrialInput
            value={metadata.author || ''}
            onChange={(v) => updateMetadata('author', v)}
            placeholder="e.g. ABD SYNTHS"
          />
        </PropertyField>
      </div>

      {/* Tags */}
      <PropertyField
        label="Custom Tags"
        helper="Comma separated. Used in catalog search and filtering."
      >
        <IndustrialInput
          value={currentTags.join(', ')}
          onChange={(v) => updateMetadata('tags', v.split(',').map((t: string) => t.trim()).filter(Boolean))}
          placeholder="ANALOG, POLYPHONIC, FX..."
          mono
        />
      </PropertyField>

      {/* Quick Tags */}
      <div className="space-y-1.5">
        <span className="text-[7px] font-black uppercase wb-text-muted tracking-widest ml-0.5">Quick Tags</span>
        <div className="flex flex-wrap gap-1">
          {SUGGESTED_TAGS.map((tag: string) => {
            const isActive = currentTags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-tighter border rounded-xs transition-all ${
                  isActive
                    ? 'bg-primary/15 border-primary/50 text-primary'
                    : 'wb-outline wb-text-muted hover:border-primary/30 hover:wb-text'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
