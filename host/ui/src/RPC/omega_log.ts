/**
 * OMEGA Logger Utility - Era 6 Aseptic Telemetry
 * Provides precision timestamps [HH:MM:SS.ms] for all console entries.
 */

export class OmegaLog {
    private static excludedTags: Set<string> = new Set(['TELEMETRY']);
    private static filtersActive: boolean = true;

    private static getTimestamp(): string {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        const s = now.getSeconds().toString().padStart(2, '0');
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        return `[${h}:${m}:${s}.${ms}]`;
    }

    public static setFilter(tag: string, active: boolean) {
        if (active) this.excludedTags.delete(tag.toUpperCase());
        else this.excludedTags.add(tag.toUpperCase());
        this.syncUI();
    }

    public static toggleTelemetry() {
        const active = this.excludedTags.has('TELEMETRY');
        this.setFilter('TELEMETRY', active);
    }

    private static syncUI() {
        const btn = document.getElementById('toggle-telemetry');
        if (btn) {
            const active = !this.excludedTags.has('TELEMETRY');
            btn.style.background = active ? 'var(--neon-cyan)' : '#331111';
            btn.style.color = active ? '#000' : '#555';
            btn.style.boxShadow = active ? '0 0 10px var(--neon-cyan)' : 'none';
        }
    }

    private static shouldLog(tag: string): boolean {
        if (!this.filtersActive) return true;
        return !this.excludedTags.has(tag.toUpperCase());
    }

    public static info(tag: string, message: string, ...args: any[]) {
        if (!this.shouldLog(tag)) return;
        console.log(`${this.getTimestamp()} [LOG] [${tag}] ${message}`, ...args);
    }

    public static warn(tag: string, message: string, ...args: any[]) {
        if (!this.shouldLog(tag)) return;
        console.warn(`${this.getTimestamp()} [WARN] [${tag}] ${message}`, ...args);
    }

    public static error(tag: string, message: string, ...args: any[]) {
        // Errors always bypass structural filters unless the tag is specifically blacklisted for some reason
        console.error(`${this.getTimestamp()} [ERROR] [${tag}] ${message}`, ...args);
    }

    public static debug(tag: string, message: string, ...args: any[]) {
        if (!this.shouldLog(tag)) return;
        console.debug(`${this.getTimestamp()} [DEBUG] [${tag}] ${message}`, ...args);
    }
}
