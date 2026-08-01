# Global Governance Rules (ABD OMEGA Manifest Editor Governance)

## 🎯 Objective
Primary entry point for OMEGA Manifest Editor governance. Defines architectural standards, technical constraints, and modular rule sets.

---

## 🗺️ Modular Rules Map

1. **[01-core-code.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/.agent/rules/01-core-code.md)**: Next.js 16, React 19, File System Access, SSE Watchdog, and TypeScript standards.
2. **[02-ui-ux.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/.agent/rules/02-ui-ux.md)**: Tailwind CSS 4, Uncodixfy (Tech-Noir Synth Aesthetics), and Web Workbench patterns.
3. **[03-security-privacy.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/.agent/rules/03-security-privacy.md)**: Sandbox safety, client-side manifest validation, and local folder permission flows.
4. **[07-methodology.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/.agent/rules/07-methodology.md)**: Mandatory SPEC -> PLAN -> CODE -> VERIFY flow.

---

## 🚫 Global Red Flags

❌ **Use of Spanish** in keys, enums, or technical schemas. The interface is bilingual (next-intl) but source code must be purely in English.
❌ **Usage of `any`** in business logic or core schemas (castings allowed only for untyped Web APIs like File System Access API with `as any`).
❌ **`console.log`** in production.
❌ **Bypassing Methodology**: No plan, no spec, no code.
❌ **Hardcoded Styles**: Use Tailwind 4 & custom CSS tokens in `omega-ui-core`.
❌ **Estética "AI-Generic"**: No standard roundings (>8px) or typical SaaS gradients. Stick to the Uncodixfy dark studio instrument vibe.
