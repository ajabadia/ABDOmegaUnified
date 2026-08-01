/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * @purpose Renderiza elementos UI básicos según las nodos de componente para el editor de manifesto OMEGA.
 * @purpose_en Renders UI primitives based on component nodes for the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:10,sig:7o6x8d
 * @lastUpdated 2026-06-20T11:09:41.455Z
 */

import React from 'react';
import type { ComponentNode } from '../../types/rack';
import { Knob } from './Knob';
import { Slider } from './Slider';
import { Led } from './Led';
import { Port } from './Port';
import { Switch } from './Switch';
import { Button } from './Button';
import { Display } from './Display';
import { Label } from './Label';

export { Knob } from './Knob';
export { Slider } from './Slider';
export { Led } from './Led';
export { Port } from './Port';
export { Switch } from './Switch';
export { Button } from './Button';
export { Display } from './Display';
export { Label } from './Label';

export interface RenderComponentOptions {
  value?: number | undefined;
  assetUrl?: string | undefined;
  resolvedColor?: string | undefined;
  resolvedIndicatorColor?: string | undefined;
}

export function renderComponentNode(
  node: ComponentNode,
  options: RenderComponentOptions = {},
): React.ReactElement | null {
  const { value = 0, assetUrl, resolvedColor, resolvedIndicatorColor } = options;

  switch (node.type) {
    case 'knob':
      return (
        <Knob
          id={node.id} size={node.size} style={node.style} bind={node.bind} value={value}
          assetUrl={assetUrl} resolvedColor={resolvedColor} resolvedIndicatorColor={resolvedIndicatorColor}
        />
      );
    case 'slider':
      return (
        <Slider
          id={node.id} size={node.size} style={node.style} bind={node.bind} value={value}
          assetUrl={assetUrl} resolvedColor={resolvedColor} resolvedIndicatorColor={resolvedIndicatorColor}
        />
      );
    case 'led':
      return (
        <Led
          id={node.id} size={node.size} style={node.style} bind={node.bind} value={value}
          assetUrl={assetUrl} resolvedColor={resolvedColor}
        />
      );
    case 'port':
      return (
        <Port
          id={node.id} label={node.label} size={node.size} style={node.style} bind={node.bind} value={value}
          resolvedColor={resolvedColor}
        />
      );
    case 'switch':
      return <Switch id={node.id} size={node.size} style={node.style} bind={node.bind} value={value} />;
    case 'button':
      return <Button id={node.id} label={node.label} size={node.size} style={node.style} bind={node.bind} value={value} aria-label={node.label} />;
    case 'display':
      return <Display id={node.id} size={node.size} style={node.style} bind={node.bind} value={value} />;
    case 'label':
      return <Label id={node.id} text={node.label} size={node.size} style={node.style} bind={node.bind} />;
    default:
      return null;
  }
}
