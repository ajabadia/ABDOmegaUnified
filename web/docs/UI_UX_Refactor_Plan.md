# UI/UX Refactor Plan: OMEGA Era 8 — Progressive Clarity

## Goal
Reduce cognitive load and improve operational speed by implementing a hierarchy-based design system (*Progressive Disclosure*), without sacrificing the power of the industrial OMEGA engine.

## Strategy
1. **Contextual Disclosure**: Only show essential controls by default.
2. **Double-Panel Empowerment**: Optimize the split-view for high-density editing.
3. **Semantic Hierarchy**: Differentiate clearly between Editing, Navigation, and Diagnostics.

---

## 1. PropertyPanel.tsx (Priority: High)
Refactor the main node inspector to use a tiered visibility model.
- **Level 1: Essential**: Basic IDs, functional role, and primary parameter.
- **Level 2: Advanced**: Aesthetics, custom skins, and detailed behaviors (hidden under "Advanced" toggle).
- **Level 3: Diagnostics**: RPC status, HPA paths, and circularity audit results (collapsible).
- **Refinement**: Reduce label font sizes and normalize input widths for better scannability.

## 2. WorkbenchInspector.tsx (Priority: High)
Convert the sidebar from a static list into a dynamic orchestrator.
- **Dual-Pane Optimization**: Support "Reference View" vs "Active View" simultaneously.
- **Visual Feedback**: Use subtle animations to indicate which panel has the focus.
- **Empty States**: Provide actionable "Quick Start" guides when no document/node is selected.

## 3. Central Workspace (Priority: Medium)
- **Visual Weight**: Increase contrast between the node canvas and the surrounding panels.
- **Focus Mode**: Allow temporary collapse of sidebars for deep composition.
- **Grid Calibration**: Improve visibility of the technical grid in light/dark modes.

## 4. HistoryPanel.tsx (Priority: Medium)
- **Semantic Grouping**: Group transient changes (batching) under a single "Control Session" entry.
- **Iconography**: Use unique markers for `TRANSACTION_COMMIT` vs `SNAPSHOT_SYNC`.
- **Latency Badges**: Show operation duration to build trust in system performance.

## 5. UI Primitives (Priority: Low)
- **Button.tsx**: Increase touch/click targets by 2px and normalize hover effects.
- **GlassPanel.tsx**: Soften internal shadows to reduce "boxed-in" feel.
- **Typography**: Enforce strict usage of monospaced fonts only for technical data.

---

## Next Steps
1. **Diagnostic**: Analyze why **Universal Cell Editor** is not launching.
2. **Prototype**: Implement the Essential/Advanced split in `PropertyPanel.tsx`.
3. **User Review**: Discuss specific dual-panel interactions to enhance focus.
