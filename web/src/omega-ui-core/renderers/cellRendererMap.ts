/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona un registro de renderizadores primitivos para el despliegue industrial en el editor de manifesto OMEGA.
 * @purpose_en Manages a registry of primitive renderers for industrial dispatching in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:17,sig:brni1e
 * @lastUpdated 2026-06-19T18:56:49.593Z
 */

import type { OmegaNode, OmegaStyleNode } from '../types/manifest';
import type { SelectOption } from './SelectRenderer';
import type { MasterRendererProps, RendererExtraOptions } from './cellRendererTypes';
import { resolveNodeStyle } from '../utils/StyleResolver';
import { renderKnobHTML } from './KnobRenderer';
import { renderPortHTML } from './PortRenderer';
import { renderLedHTML } from './LedRenderer';
import { renderSliderHTML } from './SliderRenderer';
import { renderDisplayHTML } from './DisplayRenderer';
import { renderSwitchHTML } from './SwitchRenderer';
import { renderStepperHTML } from './StepperRenderer';
import { renderSelectHTML } from './SelectRenderer';
import { renderScopeHTML } from './ScopeRenderer';
import { renderTerminalHTML } from './TerminalRenderer';
import { renderIllustrationHTML } from './IllustrationRenderer';
import { renderSequenceHTML } from './SequenceRenderer';
import { AttachmentRenderer } from './AttachmentRenderer';

export const COMP_RENDERER_MAP: Record<string, (node: OmegaNode, props: MasterRendererProps, options: RendererExtraOptions) => string> = {
  'sequence-layer': (node, _props, opt) => {
    const style = (node.style as Record<string, unknown>) || {};
    const frames = (style.frames as number) || 1;
    const frameWidth = (style.frameWidth as number) || 48;
    const frameHeight = (style.frameHeight as number) || 48;
    const orientation = (style.orientation as 'v' | 'h') || 'v';
    const opacity = style.opacity !== undefined ? (style.opacity as number) : 1;

    return renderSequenceHTML({
      assetUrl: opt.assetUrl,
      value: opt.forceFrame !== undefined ? opt.forceFrame : opt.runtimeValue,
      frames,
      frameWidth,
      frameHeight,
      orientation,
      opacity,
      style,
      isFrameIndex: opt.forceFrame !== undefined,
    });
  },
  'graphic-fragment': (node, _props, opt) => {
    return AttachmentRenderer.renderAttachmentHTML({
      type: 'graphic-fragment',
      variant: node.style?.variant || 'A_default',
      text: (node.meta?.label as string) || node.id || '',
      value: opt.runtimeValue,
      steps: opt.steps,
      style: node.style,
      manifest: opt.manifest,
      resolveAsset: opt.resolveAsset,
    });
  },
  'knob': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderKnobHTML({
      ...props,
      size: (props.size as string) || 'A',
      colorId: node.style?.variant || 'cyan',
      value: opt.runtimeValue,
      assetUrl: opt.assetUrl,
      frames: opt.assetDef?.frames,
      orientation: opt.assetDef?.orientation,
      explicitMarkerColor: resolved.style.indicatorColor || resolved.style.color,
      style: resolved.style,
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedColor: resolved.style.fontColor || opt.inherited.color as string | undefined,
      inheritedSize: resolved.style.fontSize || opt.inherited.size as number | undefined,
    });
  },
  'port': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderPortHTML({
      ...props,
      size: (props.size as string) || 'A',
      colorId: node.style?.variant || 'cyan',
      value: opt.runtimeValue,
      label: (node.meta?.label as string) || node.id || '',
      explicitColor: node.style?.variant,
      customSignalColor: resolved.style.color,
      style: resolved.style,
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedColor: opt.inherited.color as string | undefined,
      inheritedSize: opt.inherited.size as number | undefined,
    });
  },
  'led': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderLedHTML({
      ...props,
      size: (props.size as string) || 'A',
      colorId: node.style?.variant || 'cyan',
      value: opt.runtimeValue,
      explicitColor: resolved.style.color,
    });
  },
  'display': (node, props, opt) => {
    const variant = node.style?.variant || '';
    const mode = variant.includes('lcd') ? 'lcd' : (variant.includes('led') ? 'led' : 'oled');
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderDisplayHTML({
      ...props,
      size: (props.size as string) || 'A',
      colorId: node.style?.variant || 'cyan',
      value: opt.runtimeValue,
      mode,
      steps: opt.steps,
      explicitTextColor: resolved.style.color,
      explicitGlassColor: resolved.style.glassColor,
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedColor: opt.inherited.color as string | undefined,
      inheritedSize: opt.inherited.size as number | undefined,
    });
  },
  'slider-v': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderSliderHTML({
      ...props,
      type: 'slider-v',
      style: resolved.style,
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
      assetUrl: opt.assetUrl,
      frames: opt.assetDef?.frames,
      orientation: opt.assetDef?.orientation,
    });
  },
  'slider-h': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderSliderHTML({
      ...props,
      type: 'slider-h',
      style: resolved.style,
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
      assetUrl: opt.assetUrl,
      frames: opt.assetDef?.frames,
      orientation: opt.assetDef?.orientation,
    });
  },
  'switch': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderSwitchHTML({
      ...props,
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
    });
  },
  'button': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderStepperHTML({
      ...props,
      type: 'button',
      text: (node.meta?.label as string) || node.id || '',
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
    });
  },
  'push': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderStepperHTML({
      ...props,
      type: 'push',
      text: (node.meta?.label as string) || node.id || '',
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
    });
  },
  'stepper': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderStepperHTML({
      ...props,
      type: 'stepper',
      text: (node.meta?.label as string) || node.id || '',
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
    });
  },
  'select': (node, props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderSelectHTML({
      ...props,
      options: (node.meta?.options as (string | SelectOption)[]) || (node.style as Record<string, unknown>)?.options as (string | SelectOption)[] || [],
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
    });
  },
  'scope': (node, _props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    const sz = node.layout?.size || { width: 220, height: 150 };
    return renderScopeHTML({
      variant: node.style?.variant || 'phosphor',
      bind: node.bind || '',
      size: { width: sz.width || 220, height: sz.height || 150 },
      color: resolved.style.color || (node.style?.color as string | undefined),
      font: resolved.style.font || (node.style?.font as string | undefined),
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
    });
  },
  'terminal': (node, _props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    const sz = node.layout?.size || { width: 220, height: 120 };
    return renderTerminalHTML({
      variant: node.style?.variant || 'amber',
      bind: node.bind || '',
      size: { width: sz.width || 220, height: sz.height || 120 },
      color: resolved.style.color || (node.style?.color as string | undefined),
      font: resolved.style.font || (node.style?.font as string | undefined),
      inheritedFont: resolved.style.font || (opt.inherited.font as string | undefined),
      inheritedSize: resolved.style.fontSize || (opt.inherited.size as number | undefined),
      inheritedColor: resolved.style.fontColor || (opt.inherited.color as string | undefined),
    });
  },
  'illustration': (node, _props, opt) => {
    const resolved = resolveNodeStyle(node, opt.manifest);
    return renderIllustrationHTML({
      assetUrl: opt.assetUrl,
      size: (resolved.style.width && resolved.style.height) ? { width: resolved.style.width, height: resolved.style.height } : { width: 40, height: 40 },
      variant: resolved.style.variant || 'contain',
      id: node.id,
    });
  },
  'label': (node, props, opt) => {
    const ps = props.style as Partial<OmegaStyleNode> | undefined;
    return AttachmentRenderer.renderAttachmentHTML({
      type: 'label',
      variant: node.style?.variant || 'default',
      text: (node.meta?.label as string) || node.id || '',
      style: ps,
      manifest: opt.manifest,
      inherited: {
        ...(opt.inherited as Record<string, unknown>),
        font: ps?.font || (opt.inherited.font as string | undefined),
        size: ps?.fontSize || (opt.inherited.size as number | undefined),
        color: ps?.fontColor || (opt.inherited.color as string | undefined),
      },
    });
  },
};
