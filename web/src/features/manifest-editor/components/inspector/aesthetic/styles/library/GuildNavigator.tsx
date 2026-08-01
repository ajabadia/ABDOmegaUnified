'use client';

/**
 * @purpose Renderiza un componente de navegación para seleccionar categorías en el editor de manifesto OMEGA, permitiendo a los usuarios cambiar entre ver todos los elementos y categorías específicas.
 * @purpose_en Renders a navigation component for selecting categories in the OMEGA manifest editor, allowing users to switch between viewing all elements and specific categories.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:7laguu
 * @lastUpdated 2026-06-15T11:04:19.561Z
 */

import type { ElementCategory } from '@/omega-ui-core/governance/ElementCatalog';

interface GuildNavigatorProps {
  categories: ElementCategory[];
  activeGuild: ElementCategory | 'ALL';
  onSelect: (guild: ElementCategory | 'ALL') => void;
}

export default function GuildNavigator({ categories, activeGuild, onSelect }: GuildNavigatorProps) {
  return (
    <div className="flex flex-wrap gap-1.5 border-b wb-outline pb-4">
      <button
        onClick={() => onSelect('ALL')}
        className={`px-2.5 py-1 rounded-xs text-[7px] font-black uppercase tracking-widest transition-all ${
          activeGuild === 'ALL' 
            ? 'bg-primary text-black' 
            : 'wb-surface-subtle wb-text-muted hover:wb-text'
        }`}
      >
        ALL
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-2.5 py-1 rounded-xs text-[7px] font-black uppercase tracking-widest transition-all ${
            activeGuild === cat 
              ? 'bg-primary text-black' 
              : 'wb-surface-subtle wb-text-muted hover:wb-text'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
