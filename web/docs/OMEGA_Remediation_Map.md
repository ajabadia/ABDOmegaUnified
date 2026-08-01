# OMEGA Architectural Remediation Map
**Era 7.2.3 - Post ADR-014 Audit**

This document tracks the prioritized actions required to maintain the separation of powers between the Element Catalog, Blueprints, and the UCA Tree. It serves as a living record of technical hygiene following the formalization of the OMEGA Architectural Precedence Policy.

## Remediation Matrix

| File / Area | Risk | Suggested Action | Priority | Status |
| :--- | :--- | :--- | :--- | :--- |
| `src/features/manifest-editor/components/inspector/attachments/AttachmentTypeAnchor.tsx` | Medium | Maintain as a UX filter; document that it does not validate structure. | **High** | 🔍 Monitoring |
| `src/features/manifest-editor/components/inspector/shared/IndustrialGovernanceConsole.tsx` | Medium | Verify it only hides or orders capabilities and does not block valid states. | **High** | 🔍 Monitoring |
| `src/features/manifest-editor/components/inspector/sections/AestheticSection.tsx` | Medium | Ensure `getElementDefinition` is used only for discovery and labels. | **Medium** | ⏳ Pending |
| `src/features/manifest-editor/components/inspector/sections/SpatialSection.tsx` | Medium | Confirm the catalog does not condition persistence or final render. | **Medium** | ⏳ Pending |
| `src/features/manifest-editor/components/inspector/sections/LogicSection.tsx` | Medium | Audit that capabilities only guide the UI, not validation logic. | **Medium** | ⏳ Pending |
| `src/features/manifest-editor/components/inspector/shared/aesthetic/UnifiedGraphicGovernance.tsx` | Medium | Maintain governance logic as a visual aid only. | **Medium** | ⏳ Pending |
| `src/features/manifest-editor/components/inspector/shared/aesthetic/IdentityGovernance.tsx` | Medium | Verify the catalog is not used as a structural source of truth. | **Medium** | ⏳ Pending |
| `src/omega-ui-core/governance/ElementCatalog.ts` | Low | Keep explicit warnings and maintain it as a consultative inventory. | **Low** | ✅ Documented |
| `src/data/map.md` | Low | Update documentation if it still reflects legacy hard rules. | **Low** | ⏳ Pending |
| `src/features/manifest-editor/components/inspector/shared/aesthetic/map.md` | Low | Align text with ADR-014 and the precedence policy. | **Low** | ⏳ Pending |

---

## Operational Guidelines
*   **Decoupled UX**: `allowedFragments` and `capabilities` are UI hints. If a node in the UCA tree contains non-standard data, it must be rendered and persisted regardless of catalog state.
*   **Authority Hierarchy**:
    1. **UCA Tree**: The materialized reality (Ground Truth).
    2. **Blueprint**: The composition authority (Ruleset).
    3. **Element Catalog**: The discovery inventory (Guidance).
*   **Enforcement**: Any structural veto logic must reside in the Blueprint layer or the DocumentOrchestrator, never in the UI components or the Catalog.

---

## Maintenance
Run the architectural guard periodically to ensure no high-risk enforcement patterns are introduced:
```powershell
npm run arch-audit
```
