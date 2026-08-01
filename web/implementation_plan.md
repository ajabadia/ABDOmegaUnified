# Implementation Plan: Right-click Context Menu, Toolbar, & MenuBar Numeric/Free Transform (Resize & Rotate)

Add right-click context menu options, keyboard shortcuts, toolbar splitting, MenuBar integration, and Help system documentation to support:
1. **Resizing**: Both mouse-based (handles) and numeric (pixel/percentage inputs with aspect ratio lock).
2. **Rotation**: Both mouse-based (free rotation handle) and numeric (degree inputs, e.g. 0° to 360°).
3. **Canvas Nudging & Alignment**: Directly moving and resizing via arrow keys, and batch aligning/distributing selected nodes.

---

## User Review Required

> [!IMPORTANT]
> - **Menu & Context Menu Actions**:
>   - Organized under **Edit > Transform** and right-click context menus:
>     - **Mouse Resize**
>     - **Numeric Resize...** (Shortcut: `Ctrl+Alt+R`)
>     - **Mouse Rotate**
>     - **Numeric Rotate...** (Shortcut: `Ctrl+Alt+T`)
>     - **Copy Transform** (Shortcut: `Ctrl+Shift+C`)
>     - **Paste Transform** (Shortcut: `Ctrl+Shift+V`)
>     - **Align Actions**: Left, Center, Right, Top, Middle, Bottom
>     - **Distribute Actions**: Horizontally, Vertically
> - **Direct Keyboard Canvas Nudging**:
>   - **Move**: Use `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` to move selected elements by `1px`. Hold `Shift` to move by active grid step (e.g. `24px`).
>   - **Resize**: Use `Alt + ArrowUp/Down/Left/Right` to resize selected elements by `1px`. Hold `Shift + Alt` to resize by active grid step.
> - **Symmetric Element Smart Defaults**:
>   - Symmetric elements (e.g. knobs, buttons, LEDs) automatically default the aspect ratio lock to **Locked** in the popovers.
> - **Keyboard Interaction Snapping**:
>   - Holding `Shift` during mouse resize locks the aspect ratio proportionally.
>   - Holding `Shift` during free mouse rotation snaps the angle to `15°` increments.
> - **Transform Cursors & Real-Time On-Canvas Tooltip**:
>   - Hovering over handles displays cursor modifications (e.g., custom curved arrow cursors for rotation).
>   - A dark, micro-glassmorphic tooltip displays real-time values (e.g., `120px × 120px` or `45°`) next to the pointer during drags.
> - **Center Pivot Indicator**: A small neon-cyan `+` crosshair visualizes the center of rotation on the workspace preview when rotating.
> - **Dashed Neon Bounding Box Preview**:
>   - During numeric resize/rotation, a temporary dashed neon-cyan (`#00f0ff`) bounding box and angular guideline will outline the prospective transformation.
> - **Double-Click Reset**:
>   - Double-clicking the rotation handle or input fields instantly resets the respective value (to `0°` or default size).
> - **Popover Keyboard Controls**:
>   - `ArrowUp` / `ArrowDown` inside inputs: Nudge size by `1px` / `1%` (or angle by `1°`). Holding `Shift` nudges by grid/preset steps (e.g. `24px` / `24%` / `15°`).
>   - `Enter`: Commits the values.
>   - `Escape`: Cancels and closes.
> - **Transaction Safety (Undo/Redo)**:
>   - When either popover opens, we start an orchestrator transaction (`startTransaction('Transform')`).
>   - Committing calls `commitTransaction()`, and cancelling calls `abortTransaction()` to safely roll back previews.
> - **Presets & Validation**:
>   - Standard synth size presets (`24px`, `32px`, `48px`, `64px`) and rotation presets (`0°`, `90°`, `180°`, `270°`).
>   - Neon-red glow validation feedback on invalid inputs.

---

## Proposed Changes

### UI & Layout

#### [NEW] [NumericResizePopover.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/viewport/NumericResizePopover.tsx)
- Floating popover for numeric values (Resize).
- Features:
  - Toggle between `PX` and `%` units.
  - Linked aspect ratio lock toggle (auto-locked by default on symmetric items).
  - Value nudging with Arrow keys.
  - Clamping to safe minimum/maximum sizes.
  - Preset buttons & "Reset to Default" button.
  - Neon-red glow validation error states.
  - Multi-selection support applying delta sizes.

#### [NEW] [NumericRotatePopover.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/viewport/NumericRotatePopover.tsx)
- Floating popover for numeric values (Rotation).
- Features:
  - Angle slider/input in degrees (0 to 360).
  - Quick degree presets (`0°`, `90°`, `180°`, `270°`).
  - Arrow key nudging (`1°` step, or `15°` step with `Shift`).
  - Validation restricting input to valid numbers.
  - Applies rotation to active selection(s).

#### [MODIFY] [RackContextMenu.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/viewport/RackContextMenu.tsx)
- Add "Resize", "Rotate", "Copy Transform", "Paste Transform", and "Align / Distribute" submenus.

#### [MODIFY] [MenuBar.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/layout/MenuBar.tsx)
- Under the `Edit` menu, add a `Transform` submenu with:
  - `Mouse Resize`
  - `Numeric Resize...` (Shortcut: `Ctrl+Alt+R`)
  - `Mouse Rotate`
  - `Numeric Rotate...` (Shortcut: `Ctrl+Alt+T`)
  - `Copy Transform` (Shortcut: `Ctrl+Shift+C`)
  - `Paste Transform` (Shortcut: `Ctrl+Shift+V`)
  - Submenu: `Align` (Left, Center, Right, Top, Middle, Bottom)
  - Submenu: `Distribute` (Horizontally, Vertically)

#### [MODIFY] [Toolbar.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/layout/Toolbar.tsx)
- Split the Transform buttons into distinct tools:
  - Mouse Transform (Handles)
  - Numeric Resize (Direct input)
  - Mouse Rotate (Free drag handle)
  - Numeric Rotate (Degree input)

#### [MODIFY] [ResizeHandles.tsx](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/viewport/ResizeHandles.tsx)
- Add custom cursor support for resize handles.
- Add a rotation handle (a circular node extending above the top-center edge of the selection box) with a rotation hover cursor.
- Support `Shift` snapping (15° increments) on drag.
- Support `Shift` proportional aspect ratio lock on resize handles drag.
- Render a neon center pivot crosshair (`+`) and on-canvas dimension/angle tooltip during active drags.

### Shortcuts & Documentation

#### [MODIFY] [useWorkbenchShortcuts.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/hooks/useWorkbenchShortcuts.ts)
- Add `Ctrl + Alt + R` listener for Numeric Resize.
- Add `Ctrl + Alt + T` listener for Numeric Rotate.
- Add `Ctrl + Shift + C` and `Ctrl + Shift + V` listeners for copy/paste transform.
- Add `N` key listener for Numeric Resize tool.
- Add `R` key listener for Mouse/Free Rotate tool.
- Add canvas nudging:
  - Arrow keys: Move selected element by `1px` (or grid size with `Shift`).
  - `Alt + Arrow keys`: Resize selected element by `1px` (or grid size with `Shift`).

#### [MODIFY] [helpData.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/components/modals/helpData.ts)
- Add entries for the new resize, rotation, copy/paste, canvas nudging, and alignment/distribution operations.
- Add a new help subsection describing numeric, percentage, copy/paste, nudging, and rotational transformation rules.

## Verification Plan

### Manual Verification
- Select a knob or container and press `Ctrl + Alt + R` or `Ctrl + Alt + T` to verify the popovers display correctly.
- Test dragging the rotation handle above the element to freely rotate it with the mouse. Test holding `Shift` to snap to 15-degree steps.
- Verify angle presets immediately apply the requested degrees.
- Enter negative/invalid values to confirm validation states trigger the neon-red glow.
- Verify copy/paste transform transfers all dimensions and rotation parameters cleanly.
- Verify arrow key nudging moves elements and Alt + arrow key nudging resizes elements.
- Select multiple items, trigger alignment actions, and confirm relative positions update correctly.
- Verify undo/redo and cancellation/escape works flawlessly for both types of operations.
- Open the Help manual (press F1) and check shortcut documentation.
