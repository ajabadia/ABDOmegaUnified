# Security & Privacy Standards (Local-First Sandbox)

## ⚖️ Laws
1. **Explicit Directory Permission**: Never access local directories without user interaction (`window.showDirectoryPicker`). Handle permission denial and revoke states gracefully.
2. **Strict Schema Validation**: All loaded `.acemm` or `.json` manifests must be validated against official schemas using `Ajv` and `Zod` prior to state injection to prevent script injection.
3. **No External Exfiltration**: Keep design manifests, layout coordinates, and workspace data local. Do not send manifest contents to third-party endpoints.
4. **Local Host Sandbox**: CORS on Watchdog SSE endpoint (`localhost:3001`) must be restricted to the local origin (`http://localhost:3000`) to prevent arbitrary web origins from writing to the user's filesystem.
