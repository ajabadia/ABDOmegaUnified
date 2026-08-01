'use client';

/**
 * @purpose Gestiona y renderiza varios modales para el editor de manifesto OMEGA, incluyendo ingestión, ayuda, auditoría, mockup, sobre, editor de celda, diferencia y integración de blueprint.
 * @purpose_en Manages and renders various modals for the OMEGA manifest editor, including ingestion, help, audit, mockup, about, cell editor, difference, and blueprint integration.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:12,sig:1wp4f8h
 * @lastUpdated 2026-06-15T20:48:50.461Z
 */

import { AnimatePresence } from 'framer-motion';
import IngestionModal from './IngestionModal';
import HelpModal from './HelpModal';
import MockupModal from './MockupModal';
import AboutModal from './AboutModal';
import UniversalCellEditorModal from './UniversalCellEditorModal';
// import UniversalCellLibraryModal from './UniversalCellLibraryModal';
import ManifestDiffModal from './ManifestDiffModal';
import BlueprintPromptDialog from './BlueprintPromptDialog';
import type { 
  OMEGA_Manifest, 
  BlueprintDefinition, 
  BlueprintPlaceholderValues 
} from '@/omega-ui-core/types/manifest';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import { useModuleMetrics } from '@/features/manifest-editor/hooks/useModuleMetrics';
import type { ManifestDiffResult, DiffEntry } from '@/features/manifest-editor/types/diff';

interface EditorModalsProps {
  manifest: OMEGA_Manifest;
  pendingFiles: File[] | null;
  setPendingFiles: (files: File[] | null) => void;
  handleBulkUpload: (files: File[]) => void;
  helpState: { isOpen: boolean; sectionId?: string | undefined };
  closeHelp: () => void;
  // isAuditModalOpen removed — use CompliancePanel in right dock instead
  isAboutModalOpen: boolean;
  setIsAboutModalOpen: (open: boolean) => void;
  auditResult: AuditResult;
  mockupOpen: boolean;
  setMockupOpen: (open: boolean) => void;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  onDeploy: () => void;
  isCellEditorOpen: boolean;
  setIsCellEditorOpen: (open: boolean) => void;
  
  // Phase 9.2 Diff Integration
  isDiffModalOpen?: boolean | undefined;
  setIsDiffModalOpen?: ((open: boolean) => void) | undefined;
  activeDiff?: ManifestDiffResult | null | undefined;
  onMergeEntries?: ((entries: DiffEntry[]) => void) | undefined;

  // Phase 9.4 Blueprint Integration
  blueprintInjection?: {
    activeBlueprint: BlueprintDefinition | null;
    isPromptOpen: boolean;
    setIsPromptOpen: (open: boolean) => void;
    confirmInjection: (values: BlueprintPlaceholderValues) => void;
    cancelInjection: () => void;
    updatePlaceholder?: ((id: string, value: string | number | boolean) => void) | undefined;
  } | undefined;
}



export default function EditorModals({
  manifest,
  pendingFiles,
  setPendingFiles,
  handleBulkUpload,
  helpState,
  closeHelp,

  isAboutModalOpen,
  setIsAboutModalOpen,
  auditResult,
  mockupOpen,
  setMockupOpen,
  resolveAsset,
  onDeploy,
  isCellEditorOpen,
  setIsCellEditorOpen,
  isDiffModalOpen,
  setIsDiffModalOpen,
  activeDiff,
  onMergeEntries,
  blueprintInjection
}: EditorModalsProps) {
  const { metrics, sysReady } = useModuleMetrics(manifest);

  return (
    <>
      <ManifestDiffModal 
        isOpen={isDiffModalOpen || false}
        onClose={() => setIsDiffModalOpen?.(false)}
        diff={activeDiff ?? null}
        onMergeEntries={(entries) => {
          onMergeEntries?.(entries);
          setIsDiffModalOpen?.(false);
        }}
      />
      <AnimatePresence>
        {pendingFiles && pendingFiles.length > 0 && (
          <IngestionModal 
            files={pendingFiles} 
            onConfirm={(selected) => {
              handleBulkUpload(selected);
              setPendingFiles(null);
            }}
            onCancel={() => setPendingFiles(null)}
          />
        )}
      </AnimatePresence>

      <HelpModal 
        isOpen={helpState.isOpen} 
        initialSectionId={helpState.sectionId} 
        onClose={closeHelp} 
      />

      <MockupModal 
        isOpen={mockupOpen} 
        onClose={() => setMockupOpen(false)} 
        manifest={manifest} 
        audit={auditResult}
        resolveAsset={resolveAsset}
      />

      <AboutModal 
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        metrics={metrics}
        sysReady={sysReady}
        onDeploy={onDeploy}
      />

      <AnimatePresence>
        {isCellEditorOpen && (
          <UniversalCellEditorModal 
            isOpen={isCellEditorOpen}
            onClose={() => setIsCellEditorOpen(false)}
            resolveAsset={resolveAsset}
            manifest={manifest}
            onSave={(cell) => {
              console.log("Saving Cell to Library:", cell);
              // ...
              setIsCellEditorOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* <UniversalCellLibraryModal 
        isOpen={isCellLibraryOpen || false}
        onClose={() => setIsCellLibraryOpen?.(false)}
        onSelect={(dna) => {
          onAddEntityFromLibrary?.(dna);
          setIsCellLibraryOpen?.(false);
        }}
        resolveAsset={resolveAsset}
      /> */}

      {/* Phase 9.4 Blueprint Prompt */}
      {blueprintInjection && (
        <BlueprintPromptDialog 
          key={blueprintInjection.activeBlueprint?.blueprintId || 'none'}
          isOpen={blueprintInjection.isPromptOpen}
          blueprint={blueprintInjection.activeBlueprint}
          onClose={blueprintInjection.cancelInjection}
          onConfirm={blueprintInjection.confirmInjection}
          onUpdatePlaceholder={blueprintInjection.updatePlaceholder}
        />
      )}
    </>
  );
}
