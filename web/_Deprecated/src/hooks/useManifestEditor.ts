/**
 * @purpose Redirige los imports a la nueva ubicación del hook de editor de manifesto en Era 7.2.3.
 * @purpose_en Redirects imports to the new location of the manifest editor hook in Era 7.2.3.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:0,imports:0,sig:1lv0fte
 * @lastUpdated 2026-06-15T15:17:35.165Z
 */

/**
 * @deprecated THIS HOOK HAS MOVED TO ./manifest-editor/useManifestEditor
 * Please update your imports to reflect the Era 7.2.3 industrial structure.
 */
export * from '@/features/manifest-editor/hooks/useManifestEditor';
export { useManifestEditor as default } from '@/features/manifest-editor/hooks/useManifestEditor';
