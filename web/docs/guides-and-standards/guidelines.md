# OMEGA Era 7: Industrial Manifest Engineering Guidelines

## 🛡️ The 6 Golden Rules (Era 7)

### 1. The Rule of Unique Identity (Canonical ID)
Every entry in the Registry must be unique. Avoid using the same ID for different roles (e.g., a control and a CV input).
- **Bad**: `led_activity` (control) and `led_activity` (input).
- **Good**: `led_activity_ctrl` (for the parameter) and `led_activity_cv` (for the modulation input).
- **Tip**: Use suffixes like `_knob`, `_btn`, `_cv`, `_out`, `_gate`.

### 2. Separation of Roles (Registry vs UI)
- **Registry**: Defines WHAT the signal is (ID, range 0.0-1.0, type float/audio/midi, and roles).
- **UI Controls**: Defines HOW it looks. The `bind` field MUST exactly match a Registry ID.

### 3. The Patchbay Triangle
For a control to appear in the Patchbay Matrix:
1. It must exist in the Registry.
2. It must have the role `input` (for modulation) or `output` (for signal sourcing).
3. It must have a descriptive `label`.

### 4. Type Coherence
- **Audio**: 48kHz+ signals.
- **CV**: Control signals (modulations).
- **MIDI**: Note or CC data streams.
> [!IMPORTANT]
> If a port is declared as `type: audio`, the C++/WASM code must handle it as such to avoid buffer synchronization failures.

### 5. Industrial Scaling (1.5x)
OMEGA applies a 1.5x scaling factor in the virtual rack.
- Keep controls within the module's `width` x `height`.
- Leave "breathing room" around jacks to prevent virtual cable overlapping.

### 6. Compliance Governance
Always check the **Compliance** tab before exporting. Never ignore Red alerts (Double Identity) and address Yellow warnings (poor descriptions) to maintain SDK documentation standards.

---

## 🚀 Advanced Governance Checklist

### 1. Orphaned Binds
The UI control `bind` field points to a non-existent Registry ID.
- **Effect**: The control is "dead" (interactive but non-functional).
- **Prevention**: Copy-paste IDs directly from Registry to UI.

### 2. Telemetry Collision (telemetryIndex)
Era 7 LEDs and visualizers rely on the `telemetryIndex`.
- **Error**: Assigning the same index to two different visual elements.
- **Effect**: Synchronized flickering or visual garbage.
- **Rule**: Telemetry indices are unique per signal.

### 3. Violation of Dimensions (Out of Bounds)
Placing elements outside the defined `width` (hp) or `height`.
- **Effect**: Controls may float outside the faceplate or be hidden by adjacent modules.
- **Prevention**: Validate `pos.x` and `pos.y` against `dimensions`.

### 4. Container and Tab Chaos
Assigning a control to a `tab` or `container` not defined in the `layout` section.
- **Effect**: Control fails to appear in configuration modals or amasses in default corners.
- **Rule**: If `presentation.tab` is "FX", a container with `tab: "FX"` must exist.

### 5. Role-Direction Incoherence
- **Error**: Marking a port as `direction: output` but giving it an `input` role.
- **Effect**: Patchbay Matrix failure and C++ Contract Violation.
- **Rule**: Signal exit = `output`, Signal entry = `input`.

### 6. Out-of-Range Default Values
Setting a `defaultValue` outside the `min` and `max` range.
- **Effect**: Parameter saturation or unpredictable state on load.
- **Prevention**: Ensure `min <= default <= max`.

### 7. Aseptic ID Standards
Using spaces, capitals, or special characters in IDs.
- **Effect**: RPC communication and JSON parsing failures.
- **Rule**: Always use `snake_case` (e.g., `main_volume`).

### 8. Multi-Document & Clipboard Ethics
Copy-pasting between independent manifests requires structural awareness.
- **ID Regeneration**: When pasting, the engine will automatically detect collisions and regenerate IDs (e.g., `knob1` -> `knob1_p`). Never rely on hardcoded ID assumptions during cross-document transfers.
- **Context Switching**: The active document governed by the orchestrator determines the target of the paste. Always verify which tab is focused before performing clipboard operations.
- **Persistence**: Work is automatically persisted to `omega_session_docs`.
- **Undoable Resets**: A "Factory Reset" is now reversible. However, it will clear the `dirty` state. Use undo (`Ctrl+Z`) to recover a reset manifest if necessary.

### 9. History & Reversibility Ethics
The OMEGA History Engine provides a safety net for experimental authoring.
- **Action Coalescing**: Rapid changes (e.g., slider drags, typing) are grouped within a 1-second window. This means a single "Undo" might revert a series of micro-adjustments to a property.
- **Descriptive Labels**: When implementing custom UI controls that call `updateManifest`, always provide a meaningful `label`. This label appears in the history log and helps engineers navigate their design timeline.
- **Focus Protection**: Global undo/redo is automatically suppressed when focusing on text editors (Monaco) or inputs. This preserves local text editing history.

---

## 🦾 Pro-Master Engineering Details (World-Class Standards)

### 1. Missing Unit Metadata (unit)
Parameters without units (Hz, dB, ms, %, semi) appear generic in the Matrix and Patch modals.
- **Detail**: Always define the `unit` property for technical parameters.
- **Why it matters**: The system uses these units for dynamic value formatting.

### 2. Attachment Collisions
Labels or visual indicators that overlap with nearby controls or module borders.
- **Effect**: Illegible text or "ghost" interaction areas.
- **Tip**: Visualize the module within a rack to ensure labels don't invade adjacent space.

### 3. The Sin of Hardcoded Colors
Using hex codes (e.g., `#FF0000`) instead of the **OMEGA Theme Tokens**.
- **Effect**: Modules look inconsistent when the user switches between Industrial, Dark, or Ocean themes.
- **Rule**: Use variants like `red_3mm`, `B_cyan`, `neon_amber`. Let the engine manage the contrast.

### 4. Version Governance (Registry Breaking Changes)
Changing a Registry ID (e.g., from `vco_freq` to `osc_frequency`) without a version bump.
- **The Disaster**: Breaks all user-saved presets for that module.
- **Rule**: If you touch a Registry ID, increment the `version` (e.g., from 7.0 to 7.1).

### 5. Standard HP Widths (Even Multiples)
Industrial racks prefer multiples of 2HP or 4HP.
- **Tip**: Use even widths (4, 6, 8, 12 HP) to maintain the classic Eurorack aesthetic and prevent "ugly gaps" in the rack.

### 6. Grid Ergonomics (The 5px Rule)
The OMEGA UI engine is optimized for a **5px grid snap**.
- **Rule**: Always align controls and jacks to multiples of 5px (e.g., y: 40, 45, 50).
- **Effect**: Guarantees sub-pixel alignment across different browser engines and a consistent "Industrial Alignment" look.

---

## 🛡️ Preset Migration & Versioning Zen
When you change a Registry ID, you are not just renaming a variable; you are breaking the user's history.
- **V7.0 -> V7.1**: Use this for adding NEW parameters or features. Presets remain compatible.
- **V7.x -> V8.0**: Use this for major refactors (renaming IDs). This signals the engine to apply migration shunts if available, or warn the user about potential data loss.

> [!TIP]
> Following these principles ensures your modules are ready for professional distribution and official OMEGA certification. 🛠️🦾🔥🚀
