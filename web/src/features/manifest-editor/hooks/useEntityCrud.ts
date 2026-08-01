'use client';

/**
 * @purpose Gestiona operaciones CRUD para entidades en el editor de manifesto OMEGA, incluyendo agregar, duplicar y eliminar entidades con selección automática/deselección.
 * @purpose_en Manages CRUD operations for entities in the OMEGA manifest editor, including adding, duplicating, and removing entities with automatic selection/deselection.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:a4nuea
 * @lastUpdated 2026-06-15T13:21:31.518Z
 */

import { useCallback } from 'react';

/** Minimal editor interface required by useEntityCrud */
export interface EntityCrudEditor {
  addEntity: (type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => string | undefined;
  duplicateItem: (id: string) => string | undefined;
  removeItem: (id: string) => void;
}

/**
 * Entity CRUD operations — add, duplicate, and remove entities with
 * automatic selection/deselection.
 */
export function useEntityCrud(
  editor: EntityCrudEditor,
  handleSelectItem: (id: string | null) => void,
  selectedItemId: string | null,
) {
  const handleAddEntity = useCallback(
    (type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => {
      const id = editor.addEntity(type, template);
      if (id) handleSelectItem(id);
    },
    [editor, handleSelectItem],
  );

  const handleDuplicateItem = useCallback(
    (id: string) => {
      const newId = editor.duplicateItem(id);
      if (newId) handleSelectItem(newId);
    },
    [editor, handleSelectItem],
  );

  const handleRemoveItem = useCallback(
    (id: string) => {
      editor.removeItem(id);
      if (selectedItemId === id) handleSelectItem(null);
    },
    [editor, selectedItemId, handleSelectItem],
  );

  return { handleAddEntity, handleDuplicateItem, handleRemoveItem };
}
