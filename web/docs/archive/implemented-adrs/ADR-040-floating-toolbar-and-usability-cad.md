# ADR-040: Floating Draggable Toolbar and CAD Usability (Phase 25)

## Status
Accepted (v1.0.0)

## Context
As the OMEGA Manifest Editor (Era 7.2.3) evolved, several advanced features (such as templates, live audits, HIL live mode, and cell prototyping) were scattered across top-level drop-down text menus (`MenuBar`). This text-heavy desktop interface did not match the visual and structural nature of a modular hardware editor. The workspace space was constrained by static layout elements, and some advanced features (like the recursive Isolated Cell Laboratory) were disconnected from direct user interactions.

## Decision
We will restructure the workspace layout to align with professional CAD, InDesign, and Photoshop interaction models, starting with a sovereign workspace and a floating, draggable vertical toolbar.

### 1. Draggable Floating Toolbar (Toolbar.tsx)
- Create a floating, draggable panel using Framer Motion to house core creation and configuration tools.
- Place it absolute on the canvas (`left-3 top-20`) to allow full rack viewport sovereignty.
- Tools included:
  - **Select Tool**: Pointer mode.
  - **Add Primitive Tool**: Custom slide-out flyout to inject Parameter Controls or Signal Ports.
  - **Isolated Laboratory Tool**: Quick trigger for the advanced Isolated Cell Studio (`setStudioMode(true)`).
  - **Diagnostics/Audits, Blueprints, Configuration, and Live Connect (Zap)**.

### 2. Aseptic Code Decommissioning (Cleanup)
- Fulfilling structural cleanliness standards, we physically deleted obsolete dead code:
  - Custom YAML editor components (`SourceViewer`, `SourceHeader`, `SourceCodeBlock`, `useSourceEditor`) fully replaced by Monaco JSON (`SourceView.tsx`).
  - Left sidebar layout components (`WorkbenchSidebar.tsx`, `ModuleHub.tsx`) replaced by menubar and footer status integrations.
  - Hooks (`usePropertyPanel`, `useTransaction`) replaced by Vertical Accordions and direct manifest transactions.

### 3. Progressive Deprecation Warnings
- To facilitate manual validation before removal, duplicated features on the top navbar (`MenuBar` and `Header` buttons) are kept functional but visually marked as deprecated (`highlight: 'deprecated'`) using strike-through lines, orange-red warning tints, and warning dots.

## Consequences
- **Positive**: Increased workspace space and layout fluidity.
- **Positive**: Highly professional CAD-like feel with smooth drag physics.
- **Positive**: Aseptic codebase cleanliness, improving compilation and audit times.
- **Negative**: Toolbar overlays might temporarily sit on top of rack controls if dragged/placed awkwardly (prevented by drag constraints and lightweight width).
