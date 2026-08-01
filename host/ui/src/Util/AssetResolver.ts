/**
 * OMEGA Asset Resolver (Era 7.2.3)
 * Handles virtual path resolution for module-specific assets.
 */
export class AssetResolver {
    /**
     * Resolves a local module path to a full virtual URL handled by the C++ host.
     * @param moduleId The canonical ID of the module.
     * @param path The relative path inside the module directory (e.g., 'illustration.svg').
     */
    static resolve(moduleId: string, path: string | undefined): string | undefined {
        if (!path || !moduleId) return undefined;

        // 1. Return if already a full URL or data URI
        if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
            return path;
        }

        // 1.5. Handle asset:// protocol (VFS Era 7.2.3)
        if (path.startsWith('asset://')) {
            const assetPath = path.substring(8);
            return `https://juce.localhost/modules/${moduleId}/${assetPath}`;
        }

        // 2. Clean up relative indicators (./logo.svg -> logo.svg)
        const cleanPath = path.startsWith('./') ? path.substring(2) : path;

        // 3. Construct the virtual localhost URL (handled by OmegaWebViewComponent)
        return `https://juce.localhost/modules/${moduleId}/${cleanPath}`;
    }

    /**
     * Resolves a global UI asset path.
     */
    static resolveGlobal(path: string): string {
        return path; // Standard relative paths from root for global UI assets
    }
}
