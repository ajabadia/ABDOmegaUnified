'use client';

/**
 * @purpose Proporciona la estructura del menú para el componente MenuBar según las propiedades proporcionadas.
 * @purpose_en Builds and returns the menu structure for the MenuBar component based on provided props.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1pkb62t
 * @lastUpdated 2026-06-20T09:40:12.974Z
 */

import type { MenuCategory } from './menuTypes';
import type { MenuBarProps } from './MenuBar';
import {
  FileCode, Package, Layers, Camera, Zap, FolderOpen,
  Cpu, Database, Image as ImageIcon, LogOut, Undo2,
  Redo2, Terminal, HelpCircle, Shield, Settings, Layout, History,
  Sliders, Grid3X3, Ruler, Download, Map,
  Scale, Rotate3D, ClipboardCopy, ClipboardPaste, AlignStartVertical, AlignEndVertical,
  Copy, Scissors,
} from 'lucide-react';

/** Build the full menu structure from MenuBar props */
export function buildMenuItems(props: MenuBarProps): MenuCategory[] {
  const isSingleCellSelected =
    !!props.selectedNodeId &&
    (!props.multiSelectedIds || props.multiSelectedIds.length === 0);

  return [
    {
      id: 'file',
      label: 'File',
      items: [
        {
          label: props.isDirectoryLinked ? 'Linked Workspace ✓' : 'Link Workspace Folder',
          icon: FolderOpen,
          onClick: props.onLinkDirectory || (() => {}),
          highlight: 'deprecated',
        },
        {
          label: 'Load',
          icon: FolderOpen,
          submenu: [
            { label: 'Open .omega Project', icon: Package, onClick: () => (window as unknown as { __omegaLoadProject?: () => void }).__omegaLoadProject?.(), shortcut: 'Ctrl+O' },
            { label: 'Open Shelf Module (/modules)', icon: Cpu, submenu: [
              { label: 'GLOBAL MIDI INPUT (midi_in)', icon: FileCode, onClick: () => (window as any).__omegaLoadShelfModule?.('midi_in') },
              { label: 'MIDI TRIGGER (midi_trigger)', icon: FileCode, onClick: () => (window as any).__omegaLoadShelfModule?.('midi_trigger') },
              { label: 'OMEGA LAB MONITOR (omega_lab_monitor)', icon: FileCode, onClick: () => (window as any).__omegaLoadShelfModule?.('omega_lab_monitor') },
              { label: '00-TEST-PARITY (test_parity)', icon: FileCode, onClick: () => (window as any).__omegaLoadShelfModule?.('test_parity') },
            ]},
            { label: 'Import Distilled .json', icon: FileCode, onClick: () => props.onImportDistilledJson?.() },
            { label: 'Ingest Module Folder', icon: FolderOpen, onClick: () => props.onTriggerUpload('folder-upload') },
            { label: 'WASM', icon: Cpu, onClick: () => props.onTriggerUpload('bulk-upload') },
            { label: 'Contract', icon: Database, onClick: () => props.onTriggerUpload('bulk-upload') },
            { label: 'Manifest (.acemm)', icon: FileCode, onClick: () => props.onTriggerUpload('bulk-upload') },
            { label: 'Assets', icon: ImageIcon, onClick: () => props.onTriggerUpload('resource-upload') },
          ],
        },
        {
          label: 'Blueprints',
          icon: Layout,
          onClick: props.onOpenGallery || (() => {}),
          highlight: 'deprecated',
        },
        {
          label: 'Save',
          icon: Package,
          submenu: [
            { label: 'Save Work Mode', icon: FileCode, onClick: () => props.onExportManifest('work') },
            { label: 'Export Definitive Mode (Distilled)', icon: FileCode, onClick: () => props.onExportManifest('distilled') },
            { label: 'OmegaPack', icon: Package, onClick: props.onExportPack, shortcut: 'Ctrl+S' },
          ],
        },
        {
          label: 'Export',
          icon: Layers,
          submenu: [
            { label: 'Cell as Blueprint JSON', icon: Download, onClick: props.onSaveCellAsBlueprint || (() => {}), disabled: !isSingleCellSelected },
            { label: 'Studio Render', icon: Camera, onClick: props.onGenerateMockup },
            { label: 'Export to OMEGA Module Rack', icon: Package, onClick: props.onExportOmegaRack },
            { label: 'Industrial CAD Blueprint', icon: Layers, onClick: props.onExportCAD },
            { label: 'Tech Contract (TS)', icon: FileCode, onClick: () => props.onExportContract('ts') },
            { label: 'Engine Header (C++)', icon: FileCode, onClick: () => props.onExportContract('cpp') },
          ],
        },
        { type: 'divider' },
        { label: 'Deploy to Engine', icon: Zap, onClick: props.onDeploy, highlight: 'deprecated' },
        { type: 'divider' },
        { label: 'Exit', icon: LogOut, onClick: () => { window.location.href = '/'; } },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { label: 'Undo', icon: Undo2, onClick: props.onUndo, shortcut: 'Ctrl+Z' },
        { label: 'Redo', icon: Redo2, onClick: props.onRedo, shortcut: 'Ctrl+Y' },
        { type: 'divider' },
        { label: 'Copy', icon: Copy, onClick: () => props.onCopy?.(), disabled: !props.canCopy, shortcut: 'Ctrl+C' },
        { label: 'Cut', icon: Scissors, onClick: () => props.onCut?.(), disabled: !props.canCut, shortcut: 'Ctrl+X' },
        { label: 'Paste', icon: ClipboardPaste, onClick: () => props.onPaste?.(), disabled: !props.canPaste, shortcut: 'Ctrl+V' },
        { type: 'divider' },
        {
          label: 'Transform',
          icon: Scale,
          submenu: [
            { label: 'Mouse Resize', icon: Scale, onClick: () => props.onSetTool?.('transform') },
            { label: 'Numeric Resize...', icon: Ruler, onClick: () => props.onOpenNumericResize?.(), shortcut: 'Ctrl+Alt+R' },
            { label: 'Numeric Rotate...', icon: Rotate3D, onClick: () => props.onOpenNumericRotate?.(), shortcut: 'Ctrl+Alt+T' },
            { type: 'divider' },
            { label: 'Copy Transform', icon: ClipboardCopy, onClick: () => props.onCopyTransform?.(), shortcut: 'Ctrl+Shift+C' },
            { label: 'Paste Transform', icon: ClipboardPaste, onClick: () => props.onPasteTransform?.(), shortcut: 'Ctrl+Shift+V' },
            { type: 'divider' },
            { label: 'Align Left', icon: AlignStartVertical, onClick: () => props.onAlign?.('left') },
            { label: 'Center Horizontally', icon: AlignStartVertical, onClick: () => props.onAlign?.('center-h') },
            { label: 'Align Right', icon: AlignEndVertical, onClick: () => props.onAlign?.('right') },
            { label: 'Align Top', icon: AlignStartVertical, onClick: () => props.onAlign?.('top') },
            { label: 'Center Vertically', icon: AlignStartVertical, onClick: () => props.onAlign?.('center-v') },
            { label: 'Align Bottom', icon: AlignEndVertical, onClick: () => props.onAlign?.('bottom') },
            { type: 'divider' },
            { label: 'Distribute Horizontally', icon: AlignEndVertical, onClick: () => props.onDistribute?.('horizontal') },
            { label: 'Distribute Vertically', icon: AlignEndVertical, onClick: () => props.onDistribute?.('vertical') },
          ],
        },
        { type: 'divider' },
        { label: 'Universal Cell Laboratory', icon: Cpu, onClick: props.onOpenCellEditor || (() => {}), disabled: !isSingleCellSelected, shortcut: 'Ctrl+Shift+E' },
        { label: 'Module Global Configuration', icon: Settings, onClick: props.onOpenConfig, highlight: 'deprecated' },
        { type: 'divider' },
        { label: 'Reset Workspace', icon: LogOut, onClick: props.onReset, shortcut: 'Ctrl+Shift+R' },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Orbital View', icon: Layers, onClick: () => props.onTabFocus('orbital') },
        { label: 'Virtual Rack', icon: Layers, onClick: () => props.onTabFocus('rack') },
        { label: 'Source Code', icon: FileCode, onClick: () => props.onTabFocus('source') },
        { type: 'divider' },
        { label: 'History', icon: History, onClick: () => props.onTabFocus('history') },
        { type: 'divider' },
        { label: 'View Grid', icon: Grid3X3, onClick: () => props.onToggleGrid?.(), checked: props.gridVisible },
        { label: 'Show Guides', icon: Ruler, onClick: () => props.onToggleGuides?.(), checked: props.showGuides, disabled: props.isLiveMode },
        { type: 'divider' },
        {
          label: 'Inspector Level',
          icon: Sliders,
          submenu: [
            { label: 'Simple', checked: props.inspectorLevel === 'simple', onClick: () => props.onSetInspectorLevel?.('simple') },
            { label: 'Medium', checked: props.inspectorLevel === 'medium', onClick: () => props.onSetInspectorLevel?.('medium') },
            { label: 'Advanced', checked: props.inspectorLevel === 'advanced', onClick: () => props.onSetInspectorLevel?.('advanced') },
          ],
        },
        { type: 'divider' },
        {
          label: 'Show Element Boundaries (Debug UI)',
          icon: Layout,
          checked: !!props.manifest?.ui?.ucaDebug?.enabled,
          onClick: () => {
            if (!props.manifest || !props.onUpdateManifest) return;
            const enabled = !props.manifest.ui?.ucaDebug?.enabled;
            props.onUpdateManifest({
              ui: {
                ...props.manifest.ui,
                ucaDebug: {
                  ...props.manifest.ui?.ucaDebug,
                  enabled,
                  showLabels: props.manifest.ui?.ucaDebug?.showLabels ?? true,
                  hideDecorative: props.manifest.ui?.ucaDebug?.hideDecorative ?? false,
                  showCADOverlay: props.manifest.ui?.ucaDebug?.showCADOverlay ?? false,
                  selectedId: props.manifest.ui?.ucaDebug?.selectedId,
                },
              },
            });
          },
        },
        {
          label: 'Disable UCA Rendering (Fallback)',
          icon: Layers,
          checked: props.manifest?.ui?.useUCA === false,
          onClick: () => {
            if (!props.manifest || !props.onUpdateManifest) return;
            props.onUpdateManifest({
              ui: { ...props.manifest.ui, useUCA: props.manifest.ui?.useUCA === false ? true : false },
            });
          },
        },
      ],
    },
    {
      id: 'window',
      label: 'Window',
      items: [
        { label: 'Layers', icon: Layers, checked: props.windowStates?.window_layers, onClick: () => props.onToggleWindow?.('window_layers'), shortcut: 'Ctrl+Shift+L' },
        { label: 'Mini Map', icon: Map, checked: props.miniMapVisible, onClick: () => props.onToggleMiniMap?.(), shortcut: 'Ctrl+Shift+M' },
        {
          label: 'Rack Properties',
          icon: Settings,
          checked: props.windowStates?.window_rack_properties,
          onClick: () => props.onToggleWindow?.('window_rack_properties'),
          submenu: [
            { label: 'Identity & Branding', checked: props.rackSections?.essentialIdentity, onClick: () => props.onToggleRackSection?.('essentialIdentity') },
            { label: 'Chassis & Power', checked: props.rackSections?.physicalEmulationProfile, onClick: () => props.onToggleRackSection?.('physicalEmulationProfile') },
            { label: 'Grid & Workspace', checked: props.rackSections?.activeConstructionPlane, onClick: () => props.onToggleRackSection?.('activeConstructionPlane') },
            { label: 'Aesthetics', checked: props.rackSections?.aestheticsGlobals, onClick: () => props.onToggleRackSection?.('aestheticsGlobals') },
            { label: 'Architecture', checked: props.rackSections?.architecture, onClick: () => props.onToggleRackSection?.('architecture') },
            { label: 'System Engineering', checked: props.rackSections?.diagnostics, onClick: () => props.onToggleRackSection?.('diagnostics') },
          ],
        },
        { label: 'Element Properties', icon: Sliders, checked: props.windowStates?.window_properties, onClick: () => props.onToggleWindow?.('window_properties') },
        { label: 'Compliance (Audit)', icon: Shield, checked: props.windowStates?.window_compliance, onClick: () => props.onToggleWindow?.('window_compliance'), shortcut: 'Ctrl+Shift+A' },
        { label: 'Blueprints Library', icon: Zap, checked: props.windowStates?.window_blueprints, onClick: () => props.onToggleWindow?.('window_blueprints') },
        { label: 'Information', icon: HelpCircle, checked: props.windowStates?.window_info, onClick: () => props.onToggleWindow?.('window_info') },
        { label: 'History', icon: History, checked: props.windowStates?.window_history, onClick: () => props.onToggleWindow?.('window_history') },
        { label: 'Console', icon: Terminal, checked: props.showLogs, onClick: () => props.onToggleLogs?.() },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'Engineering Manual', icon: HelpCircle, onClick: props.onHelp },
        { label: 'Guided Tour', icon: HelpCircle, onClick: () => props.onToggleTour?.() },
        { type: 'divider' },
        { label: 'About OMEGA', icon: Shield, onClick: props.onOpenAbout },
      ],
    },
  ];
}
