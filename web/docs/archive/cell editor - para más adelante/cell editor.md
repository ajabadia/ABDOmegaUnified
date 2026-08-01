ADR-010: Evolution of Universal Cell Laboratory into Asset Behavior Lab
Status: PROPOSED
Date: 2026-05-11
Supersedes: None
Related: ADR-008 (Phase 8 History Engine), ADR-009 (Phase 9 Advanced Authoring Station)

Context
The current OMEGA authoring application already contains a feature called Universal Cell Laboratory, exposed through UniversalCellEditorModal, intended to build reusable UI “cells” such as knobs, buttons, labels, LEDs, and other visual controls from a host entity plus fragments/attachments. The current editor already includes a real-time preview rendered through CellRenderer.renderCellHTML, a fragment tree, host-vs-fragment editing, DNA export, and an inspector-driven aesthetic governance system.

The current system also already includes a reusable asset governance layer that supports static images and sequences/filmstrips through UnifiedGraphicGovernance and IdentityGovernance, with metadata such as frames, frameWidth, frameHeight, orientation, mode, graphicMode, zeroAnchor, mouseResponse, category, polarity, fitting, offsets, and variant selection flowing into OmegaStyleNode. This is a stronger base than a simple “knob editor”: it is already a partial authoring environment for visual behavior attached to UI components.

External reference research confirms that WebKnobMan is not limited to knobs. Its public gallery explicitly classifies uploads by Knob, Slider, Switch, and Other, and its rendering workflow is based on reusable .knob layer definitions that can be re-opened and re-rendered as image strips. WebKnobMan itself exposes a layer-based animation authoring model with transform, offset, rotation, mask, lighting, shadow, frame mask, and export to PNG strips, while its gallery can open assets directly in WebKnobMan or export them through Easy Rendering as PNG strips.

This external model is relevant because the OMEGA team already tried to make a more procedural “inside the app” authoring utility for knobs/buttons/etc. and found that it was not producing robust results. The direction that produced more promising output was filmstrip import: visual authoring happens outside, and the OMEGA application handles metadata, mapping, composition, preview, and reuse. That direction aligns well with the current codebase and with DRY principles, because the existing cell system can be evolved instead of introducing a parallel editor stack.

The target is therefore not to clone KnobMan in full. The target is to evolve Universal Cell Laboratory into an Asset Behavior Lab: a system that can ingest static assets and filmstrips created externally or internally, map them to interaction semantics, compose them into reusable OMEGA cells, and eventually support not only knobs but also sliders, switches, buttons, VU meters, displays, LEDs, and rack plates/background panels.

Decision
Universal Cell Laboratory will be evolved into a new authoring subsystem conceptually named Asset Behavior Lab, while keeping the existing cell-based architecture as the canonical reusable unit. The laboratory will not attempt to become a full procedural bitmap renderer equivalent to KnobMan. Instead, it will specialize in:

Importing static images and filmstrips.

Defining behavior presets that map value/state/input to frame selection or transform behavior.

Composing multiple visual layers into one reusable cell.

Supporting both control elements and non-interactive art assets such as rack plates/background surfaces.

Reusing the existing OMEGA entity/presentation/style/cell architecture wherever possible.

This ADR formalizes four key design decisions:

Cells remain the reusable authoring unit.
The system will continue to treat ManifestEntity plus presentation and attachments as the canonical output format for reusable UI parts.

Asset behavior becomes a first-class concept.
The current scattered filmstrip-related properties inside OmegaStyleNode are sufficient for basic support, but not expressive enough for a future authoring workflow comparable to WebKnobMan’s control diversity. A structured behavior model will be introduced, either as presentation.assetBehavior or as a nested node inside presentation.style, while preserving backward compatibility with the existing fields.

External-first visual generation.
The main production workflow will assume filmstrips and static assets are often authored externally and imported. Internal generation, if added later, will be limited to simple primitives, overlays, masks, labels, indicators, and rack plate surfaces rather than fully procedural photorealistic controls.

DRY over duplication.
Existing asset selector, governance domains, preview renderer, attachment composition, ingestion, and manifest contract infrastructure will be reused wherever possible. New authoring features must be implemented as extensions to these primitives, not separate overlapping systems.

Why this direction
The current OMEGA system already has substantial infrastructure that overlaps with the operational half of a KnobMan-like workflow. UniversalCellEditorModal already handles host/fragments, selection, editing, ordering, preview, and export. AssetSelector, the sequence ingestion tooling, and the graphic governance modules already handle asset discovery, filtering, import, sequence metadata, and fitting semantics.

WebKnobMan’s strength is not “it makes knobs”; its strength is that it lets a designer define layered animated assets and export sprite strips that can later be mapped to controls. OMEGA does not need to reproduce that exact bitmap rendering stack to reach similar practical value. It can instead own the higher-level concerns WebKnobMan does not solve for OMEGA: reusable control DNA, semantic bindings, host/fragment composition, runtime preview, manifest integration, layout governance, and standardized behavior presets.

Existing system assessment
Strong reusable foundations
The following existing pieces are strong and should be retained with minimal conceptual change:

Existing piece	Current role	Reuse value	Notes
UniversalCellEditorModal	Cell authoring modal with preview, host/fragments, export	Very high	Good shell for the future lab; needs refocus, not replacement.
CellRenderer.renderCellHTML	Runtime-like preview renderer	Very high	Critical for instant visual validation of imported filmstrips and composed cells.
IndustrialGovernanceConsole + governance modules	Capability-driven inspector UI	Very high	Can absorb new behavior presets and layer controls without reinventing editor UI.
UnifiedGraphicGovernance	Unified asset selection for static/sequence	Very high	Already the closest thing to the future authoring core.
IdentityGovernance	Variant/asset/filmstrip mapping	High	Can converge with UnifiedGraphicGovernance to avoid duplication.
AssetSelector	Asset browsing and metadata ingestion	Very high	Already supports sequences/statics and folder-based filtering.
SequenceAnatomyInspector / sequence governance	Filmstrip anatomy editing	High	Should be generalized into behavior mapping, not remain “sequence-only”.
OmegaStyleNode	Unified aesthetic node	High	Good compatibility layer, but should stop accumulating unrelated semantics forever.
Ingestion and library systems	Asset and cell import	High	Necessary for scaling cell templates and behavior presets.
Structural weaknesses
The current system also has important limitations that prevent it from becoming a true multi-control asset lab without refactoring:

Behavior is implied, not modeled.
Filmstrip behavior currently depends on a loose set of fields (mode, frames, orientation, zeroAnchor, mouseResponse, polarity, etc.) spread through style metadata. This works for small cases but becomes brittle when modeling sliders, switches, buttons, VU meters, LEDs, or stateful components.

Cell composition and asset behavior are mixed.
The current editor mixes the responsibilities of “what fragments compose this cell?” with “how does this visual asset respond to value or state?”. This increases cognitive load and makes simple use cases harder than necessary.

Too much genericity in the wrong place.
The governance system is powerful, but the user intent is often concrete: “I want a rotary knob from this filmstrip”, “this is a 2-state switch”, “this is a VU meter”, “this is a rack plate background”. The future system needs opinionated presets above the generic property grid.

No explicit support for layered render recipes.
KnobMan/WebKnobMan work through layered visual construction. OMEGA currently has fragments/attachments, which is close, but there is no explicit “render recipe” abstraction for visual-only layers such as base plate, indicator, glare, label plaque, shadow overlay, and state overlay.

No dedicated rack plate/background workflow.
The current system is entity-centered. Backgrounds and rack plates need a related but slightly different authoring path: larger surfaces, tile/stretch modes, screws/decals/label strips, and often no interactive binding.

Architectural direction
A. Keep the current cell contract as output
The output artifact remains an OMEGA-compatible reusable cell using the existing entity model. That avoids introducing a second runtime format and preserves compatibility with previews, manifests, import/export, and future blueprint systems.

B. Introduce AssetBehavior as a first-class model
A formal behavior object should be added. Example conceptual shape:

ts
interface AssetBehavior {
  preset:
    | 'static'
    | 'rotary-continuous'
    | 'slider-linear'
    | 'switch-toggle'
    | 'button-momentary'
    | 'button-latched'
    | 'led-binary'
    | 'led-multistate'
    | 'meter-vu'
    | 'meter-step'
    | 'display-state'
    | 'plate-static';
  source: 'asset' | 'generated';
  assetId?: string;
  assetType?: 'static' | 'filmstrip' | 'svg';
  frameCount?: number;
  orientation?: 'v' | 'h';
  mapping?: {
    input: 'value' | 'state' | 'active' | 'signal' | 'telemetry' | 'manual';
    mode: 'continuous' | 'stepped' | 'state-map' | 'bipolar' | 'unipolar';
    zeroAnchor?: number;
    polarity?: 'normal' | 'inverted';
    mouseResponse?: 'rotary' | 'linear' | 'button';
    stateMap?: Array<{ state: string; frameStart: number; frameEnd?: number }>;
    frameRange?: { start: number; end: number };
  };
  transform?: {
    fit?: 'stretch' | 'cover' | 'contain' | 'tile' | 'center';
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
    rotationMode?: 'none' | 'rendered' | 'css';
  };
}
This new object should coexist with legacy style fields during migration. Existing properties in OmegaStyleNode remain valid as compatibility aliases, but the editor should increasingly read and write the structured behavior node first.

C. Distinguish three authoring layers
The future lab should separate concerns into three explicit layers:

Layer	Purpose	Example
Cell Structure	Host + fragments + bindings + labels + composition	Knob with label plate and LED ring
Asset Behavior	How a specific asset responds to input/state	101-frame rotary filmstrip
Visual Surface	Materials, colors, overlays, backgrounds, rack plates	Black anodized panel with screws and engraved strip
The current system already partially covers these concerns, but they are intermixed in one editing flow. The redesign should make them explicit in both data model and UI.

Reuse strategy (DRY)
What should be reused almost as-is
UniversalCellEditorModal shell, layout split, preview pane, export flow.

CellRenderer.renderCellHTML preview contract.

AssetSelector browsing/import workflow.

Existing filmstrip metadata ingestion from selected assets.

Inspector collapsible sections and capability-driven governance scaffolding.

Existing type catalog (OMEGAELEMENTCATALOG) and component taxonomy.

Existing attachment model for layer-like composition.

Existing FittingGovernance, spatial controls, typography controls, and mechanical controls.

What should be merged or simplified
Merge IdentityGovernance and UnifiedGraphicGovernance concepts.
Both deal with asset identity and filmstrip semantics. They should converge into a single AssetBehaviorGovernance module to avoid duplicate logic and duplicated filmstrip controls.

Convert sequence-specific UI into behavior-specific UI.
SequenceAnatomyInspector should evolve into a generalized BehaviorMappingInspector so it can edit rotary, linear, stepped, state-based, and meter mappings.

Reduce raw property exposure in early workflows.
Default users should start from presets such as “Rotary Knob”, “VU Meter”, “2-State Switch”, “Momentary Button”, “Rack Plate”. Advanced fields remain available in expert mode.

Stop overloading style indefinitely.
OmegaStyleNode should remain a compatibility layer for visual parameters, but control semantics should migrate to a dedicated behavior node where possible.

What must be newly implemented
AssetBehavior data model and migration adapters.

AssetBehaviorGovernance inspector module.

Preset-based creation wizard inside the lab.

Layer recipe editor for purely visual layers.

Dedicated rack plate/background workflow.

State mapping editor for non-continuous controls.

Multi-layer composition presets for common component families.

Functional scope
Control families to support
The future lab should target at least the following families, reflecting both WebKnobMan’s gallery taxonomy and OMEGA’s own component set.

Family	Typical asset type	Behavior model	Notes
Rotary knob	Filmstrip or static+CSS rotate	Continuous rotary	Existing best-supported path.
Slider	Filmstrip cap, static track, or combined strip	Linear continuous/stepped	Must support vertical and horizontal.
Switch	Filmstrip or static states	Binary or multi-state	Needs explicit state map.
Button	Filmstrip or static states	Momentary or latched	Hover/pressed/active variants optional.
LED / indicator	Static or multi-state strip	Binary, multi-state, blink-capable later	Good low-complexity preset.
VU / meter	Filmstrip, vertical sequence, horizontal sequence	Value-driven stepped or continuous	Important based on desired parity with WebKnobMan use cases.
Display / readout	Static frame or state strip plus text overlay	State-driven	Can reuse typography and label governance.
Rack plate / background	Static, tiled, layered, generated overlays	No value behavior or optional decorative states	Requires dedicated plate workflow.
Rack plates and backgrounds
Rack plates are not just oversized cells; they are surface assets. However, the existing host/fragment approach can still model them if simplified. A rack plate can be treated as a non-interactive cell or as a specialized surface template with these capabilities:

Base background image or generated fill.

Material/style preset (painted metal, brushed aluminum, matte black, aged panel, etc.).

Tile/stretch/cover/contain logic.

Optional screw layers, decal layers, label strips, logos, and cutout overlays.

Optional slot zones or anchor hints for later placement of controls.

This suggests introducing a component: 'plate' or reusing illustration/container semantics with a new plate-static behavior preset. The goal is to avoid a separate editor when the same preview/composition/asset architecture already exists.

Proposed UX redesign
The current Universal Cell Laboratory UI is visually strong and already organized as preview + editor + tabs. The main change should be conceptual simplification.

New top-level workflow
Choose artifact type

Control Cell

Indicator Cell

Meter Cell

Rack Plate / Surface

Choose behavior preset
Examples: Rotary Knob, Linear Slider, Toggle Switch, Momentary Button, Binary LED, VU Meter, Static Plate.

Choose asset source

Static image

Filmstrip

Existing cell preset

Generated primitive base (optional, simple only)

Map behavior

Continuous / stepped / state map

Frame count / frame range

Orientation

Polarity

Input response

Compose layers

Base body

Indicator overlay

Label plate

LED / glare / shadow / screws / decorative layers

Preview and export

Runtime preview

Test value / state scrubbing

DNA export

Save to library

UI sections
The current “Fragments / Properties” split should be retained, but “Properties” should be reorganized into:

Identity

Behavior

Layers

Surface

Labels & Typography

Interaction & Binding

Advanced / Compatibility

This keeps the visual shell familiar while making the authoring intent much clearer.

Data model migration
Short-term compatibility
During the first implementation stage, the renderer and editor should accept both:

Legacy style-driven filmstrip fields in OmegaStyleNode.

New structured AssetBehavior object.

Migration adapters should normalize both into a common internal representation before rendering.

Long-term normalization
Over time:

frames, frameWidth, frameHeight, orientation, mode, mouseResponse, zeroAnchor, polarity, graphicMode, and related control semantics should move under assetBehavior.

OmegaStyleNode should remain focused on actual presentation properties: colors, fitting, offsets, dimensions, opacity, material, blur, typography, label geometry, etc.

This reduces semantic leakage and makes the contract easier to reason about.

Rendering model
Renderer responsibilities
CellRenderer should be evolved to support a normalized behavior pipeline:

Resolve asset and metadata.

Resolve behavior preset and input mapping.

Compute active frame/state/transform from runtime value.

Render base host and fragments in order.

Apply fitting, offsets, dimensions, and optional overlays.

This remains compatible with the current preview approach, but removes special-case logic scattered across UI modules.

Frame computation rules
The renderer should standardize a small set of frame resolution functions:

continuous(value, frameCount, polarity, zeroAnchor)

stepped(value, stepCount, frameRange)

stateMap(state, mapping)

meter(value, min, max, frameRange, orientation)

buttonState(active, hovered, pressed)

This is especially important for VU meters, switches, and buttons, which are weaker fits for the current “sequence = filmstrip” mentality.

Simplification principles
To stay DRY and avoid another underpowered subsystem, the following principles should be enforced:

One asset browser only.
Do not create a second browser just for the lab; extend AssetSelector and its metadata contract.

One renderer only.
The authoring preview must be the same rendering pipeline used in the editor/runtime preview path, or as close as possible.

One behavior normalization layer.
Avoid component-specific ad hoc frame mapping. All controls should resolve through preset-based shared logic.

One composition model.
Use host + fragments/layers consistently rather than inventing a separate “asset stack” model unless absolutely necessary.

Presets over property soup.
The UI should bias toward reusable recipes, with expert override available only when needed.

Implementation roadmap
Phase 10.1 — Contract hardening
Define AssetBehavior interface and compatibility adapters.

Add normalized behavior resolver used by preview/render paths.

Introduce backward-compatible read/write helpers.

Add tests for legacy and new cell definitions.

Phase 10.2 — Inspector convergence
Merge or supersede UnifiedGraphicGovernance and IdentityGovernance with AssetBehaviorGovernance.

Generalize SequenceAnatomyInspector into BehaviorMappingInspector.

Add behavior presets with opinionated defaults.

Keep raw advanced fields behind expert mode.

Phase 10.3 — Universal Cell Laboratory refocus
Rebrand the modal internally as Asset Behavior Lab while preserving the current shell.

Add “artifact type” and “behavior preset” entry flow.

Split “Properties” into Identity / Behavior / Layers / Surface / Typography / Advanced.

Add test scrubbing UI for value and state simulation.

Phase 10.4 — Layer composition system
Formalize visual-only layer recipes using existing attachments as the base abstraction.

Add presets for knob body + indicator, button body + press state, slider cap + track, VU bar + glare, plate + screws + labels.

Allow reusable layer macros/templates.

Phase 10.5 — Plate & background authoring
Add rack plate/surface presets.

Support base image, tiling, decals, screws, labels, and slot guides.

Allow export as reusable plate DNA or manifest-ready decorative entity.

Phase 10.6 — Library industrialization
Save behavior presets and authored cells into the library.

Add tagging by family: knob, slider, switch, button, meter, plate, led, display.

Support import/export of reusable lab artifacts.

Optionally support future ingestion of .knob-derived metadata if useful, without depending on it.

Risks
Positive consequences
Reuses a large amount of existing architecture instead of replacing it.

Aligns with the already successful filmstrip-import direction.

Expands beyond knobs into the actual family of controls desired: sliders, buttons, switches, VU meters, LEDs, displays, and rack plates.

Produces reusable OMEGA-native assets rather than isolated bitmap strips.

Negative consequences
The current data contract will become more complex during migration because both legacy style fields and new structured behavior fields must coexist temporarily.

Without preset discipline, the editor could remain overly generic and difficult to use.

Layer composition may tempt the team into building a mini graphics engine; scope control is essential.

Rack plate authoring can drift into full visual design tooling if not constrained to OMEGA-relevant surfaces and overlays.

Validation criteria
A user can create a reusable rotary knob, slider, button, switch, VU meter, and rack plate using the same laboratory shell.

All those artifacts can be previewed through the same normalized renderer path.

Existing legacy cells using current filmstrip/style fields continue to render correctly after migration.

The new system reduces duplicate governance code by converging graphic/identity/sequence editing into one behavior-centered module.

The workflow becomes more guided than the current property-centric flow while preserving expert override.

The design remains DRY: one asset browser, one renderer, one behavior resolver, one composition model.

Development notes
The recommended strategic framing is not “build KnobMan inside OMEGA.” The recommended framing is “turn the existing Universal Cell Laboratory into a reusable asset behavior authoring station for OMEGA-native controls and surfaces.” WebKnobMan demonstrates that the practical asset universe includes knobs, sliders, switches, and other animated UI parts, not just knobs. The current OMEGA system already owns the surrounding problems of reuse, manifest integration, bindings, composition, and runtime preview.

That makes the highest-leverage path clear: keep the current cell architecture, introduce a first-class behavior model, converge duplicated governance modules, add presets for the main control families, and extend the same architecture to rack plates/backgrounds. This path is both technically realistic and aligned with DRY engineering principles.