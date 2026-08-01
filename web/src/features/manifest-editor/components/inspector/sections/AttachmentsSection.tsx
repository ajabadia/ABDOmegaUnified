'use client';

/**
 * @purpose Gestiona una sección para gestionar las conexiones de señal en el editor de manifesto OMEGA, incluyendo agregar, eliminar y actualizar conexiones.
 * @purpose_en Manages a section for managing signal attachments in the OMEGA manifest editor, including adding, removing, and updating attachments.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1qf3ffv
 * @lastUpdated 2026-06-15T11:38:14.518Z
 */

import { Paperclip } from 'lucide-react';
import type { ManifestEntity, OMEGA_Manifest, Attachment, OmegaNode } from '@/omega-ui-core/types/manifest';
import { useAttachmentsLogic } from '@/features/manifest-editor/hooks/useAttachmentsLogic';
import { adaptNodeToManifestEntity } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';
import AttachmentsHeader from '@/features/manifest-editor/components/inspector/attachments/AttachmentsHeader';
import AttachmentCard from '@/features/manifest-editor/components/inspector/attachments/AttachmentCard';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
 
interface AttachmentsSectionProps {
  item: OmegaNode;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OmegaNode>) => void;
  availableBinds?: string[] | undefined;
  onHelp?: ((sectionId: string) => void) | undefined;
  onOpenConfig?: (() => void) | undefined;
}
 
export default function AttachmentsSection({ item: node, manifest, onUpdate, availableBinds = [], onHelp, onOpenConfig }: AttachmentsSectionProps) {
  const item = adaptNodeToManifestEntity(node);
  const onLegacyUpdate = (u: Partial<ManifestEntity>) => {
    onUpdate(u as unknown as Partial<OmegaNode>);
  };

  const { 
    attachments, coreAtt, expandedIdx, setExpandedIdx, 
    addAttachment, removeAttachment, updateAttachment 
  } = useAttachmentsLogic(item, onLegacyUpdate);

  const hostType = node.cellRef || node.kind || 'knob';

  return (
    <div className="space-y-4 pt-2">
      <InspectorCollapsible 
        title="Signal Attachments" 
        icon={Paperclip}
      >
        <div className="space-y-4 pt-2">
          <AttachmentsHeader onAdd={addAttachment} onHelp={onHelp} />

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {/* VIRTUAL CORE ITEM */}
            <AttachmentCard 
              att={coreAtt} 
              manifest={manifest}
              hostType={hostType}
              idx="core" 
              isCore={true} 
              isExpanded={expandedIdx === 'core'} 
              onToggle={() => setExpandedIdx(expandedIdx === 'core' ? null : 'core')}
              onRemove={() => {}} 
              onUpdate={updateAttachment} 
              availableBinds={availableBinds}
              onOpenConfig={onOpenConfig}
            />

            {/* LIST OF FRAGMENTS */}
            {attachments.map((att: Attachment, idx: number) => (
              <AttachmentCard 
                key={idx}
                att={att} 
                manifest={manifest}
                hostType={hostType}
                idx={idx} 
                isExpanded={expandedIdx === idx} 
                onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                onRemove={removeAttachment} 
                onUpdate={updateAttachment} 
                availableBinds={availableBinds}
                onOpenConfig={onOpenConfig}
              />
            ))}
          </div>
        </div>
      </InspectorCollapsible>
    </div>
  );
}
