"use client";

/**
 * @purpose Renderiza una vista previa de entidad fantasma utilizando el mismo motor de renderizado del Virtual Rack.
 * @purpose_en ** Renders a phantom entity preview using the same rendering engine as the Virtual Rack.
 * @refactorable false
 * @classification ** UI Component
 * @complexity ** Low
 * @fingerprint exports:1,imports:6,sig:1c3sgsk
 * @lastUpdated 2026-06-15T11:49:21.392Z
 */

import type {
  OMEGA_Manifest,
  ManifestEntity,
  OmegaStyleNode,
  LayoutContainer,
} from "@/omega-ui-core/types/manifest";
import { CellRenderer } from "@/omega-ui-core/renderers/CellRenderer";
import { useDesignTokens } from "@/omega-ui-core/hooks/useDesignTokens";
import { getElementDefinition } from "@/omega-ui-core/governance/ElementCatalog";
import IndustrialContainer from "../../shared/IndustrialContainer";
import { adaptManifestEntityToNode } from "@/features/manifest-editor/hooks/entities/ucaInspectorAdapter";
interface CanonicalStylePreviewProps {
  type: string;
  aesthetics: Partial<OmegaStyleNode>;
  manifest: OMEGA_Manifest;
  resolveAsset: (id: string | undefined) => string | undefined;
}
/** * Component extracted from StyleEditorModal. * Renders a phantom entity preview using the same rendering engine as the Virtual Rack (CellRenderer / IndustrialContainer). */ export default function CanonicalStylePreview({
  type,
  aesthetics,
  manifest,
  resolveAsset,
}: CanonicalStylePreviewProps) {
  const def = getElementDefinition(type);
  const phantomEntity: ManifestEntity = {
    id: "preview-phantom",
    type: type,
    role: "telemetry",
    label: "Preview Phantom",
    size: { width: 320, height: 224, w: 320, h: 224 },
    bind: "none",
    pos: { x: 0, y: 0 },
    presentation: {
      component: type,
      variant: "default",
      style: aesthetics,
      size: { width: 320, height: 224, w: 320, h: 224 },
      tab: "MAIN",
      attachments: [],
      offsetX: 0,
      offsetY: 0,
    },
  };
  useDesignTokens(manifest, phantomEntity);
  const isStructure =
    def?.category === "infrastructure" ||
    def?.category === "rack" ||
    def?.id === "container" ||
    def?.id === "group";
  if (isStructure) {
    return (
      <IndustrialContainer
        container={phantomEntity as unknown as LayoutContainer}
        manifest={manifest}
        resolveAsset={resolveAsset}
        className="w-80 h-56 shadow-2xl"
      />
    );
  }
  return (
    <div className="relative scale-[2.0] flex items-center justify-center text-white forced-dark-context">
      {" "}
      <div
        dangerouslySetInnerHTML={{
          __html: CellRenderer.renderCellHTML(
            adaptManifestEntityToNode(phantomEntity),
            {
              skin: "industrial",
              zoom: 1.0,
              runtimeValue: 0.5,
              steps: 100,
              manifest,
              resolveAsset,
            },
          ),
        }}
      />{" "}
    </div>
  );
}
