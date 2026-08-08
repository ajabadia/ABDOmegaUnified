/**
 * OMEGA Asset Resolver (Era 7.2.3)
 * Handles virtual path resolution for module-specific assets.
 */
export class AssetResolver {
    /**
     * Resolves a local module path to a full virtual URL handled by the C++ host or web standalone.
     * @param moduleId The canonical ID of the module.
     * @param path The relative path inside the module directory (e.g., 'illustration.svg').
     */
    static resolve(moduleId: string, path: string | undefined): string | undefined {
        if (!path || !moduleId) return undefined;

        // 1. Return if already a full URL or data URI
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
            return path;
        }

        // 2. Clean up relative indicators (./logo.svg -> logo.svg)
        const cleanPath = path.startsWith('./') ? path.substring(2) : path;
        const assetPath = path.startsWith('asset://') ? path.substring(8) : cleanPath;

        // 3. Detect JUCE C++ Web View vs Web Standalone Browser
        const isJuce = typeof window !== 'undefined' && 
            (!!(window as any).__JUCE__ || window.location.hostname === 'juce.localhost');

        if (isJuce) {
            return `https://juce.localhost/modules/${moduleId}/${assetPath}`;
        }

        // Web Standalone Browser Fallback (Use absolute root-relative paths starting with /)
        if (assetPath.startsWith('assets/modules/') || assetPath.startsWith('modules/')) {
            return `/${assetPath.replace(/^\/+/, '')}`;
        }
        return `/modules/${moduleId}/${assetPath}`;
    }

    /**
     * Resolves a global UI asset path.
     */
    static resolveGlobal(path: string): string {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('/')) {
            return path;
        }
        return `/${path}`;
    }
}
