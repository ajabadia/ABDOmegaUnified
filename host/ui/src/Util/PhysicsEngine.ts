/**
 * OMEGA Physics Engine (Era 7.2.3)
 * Manages global atmospheric lighting and shadow projection.
 */
import { OmegaLog } from '../RPC/omega_log.js';

export class PhysicsEngine {
    private static currentAngle: number = 135;
    private static currentDistance: number = 4;
    private static currentBlur: number = 4;
    private static currentColor: string = 'rgba(0,0,0,0.5)';

    /**
     * Injects the global shadow variables into the root document.
     */
    static updateGlobalLighting(angle?: number, distance?: number, blur?: number, color?: string) {
        if (angle !== undefined) this.currentAngle = angle;
        if (distance !== undefined) this.currentDistance = distance;
        if (blur !== undefined) this.currentBlur = blur;
        if (color !== undefined) this.currentColor = color;

        const angleRad = (this.currentAngle * Math.PI) / 180;
        const shadowX = Math.cos(angleRad) * this.currentDistance;
        const shadowY = Math.sin(angleRad) * this.currentDistance;

        const root = document.documentElement;
        root.style.setProperty('--omega-global-shadow-x', `${shadowX.toFixed(2)}px`);
        root.style.setProperty('--omega-global-shadow-y', `${shadowY.toFixed(2)}px`);
        root.style.setProperty('--omega-global-shadow-blur', `${this.currentBlur}px`);
        root.style.setProperty('--omega-global-shadow-color', this.currentColor);

        OmegaLog.debug('PHYSICS', `Global Lighting Updated: ${this.currentAngle}deg, Dist: ${this.currentDistance}px`);
    }

    /**
     * Synchronizes physics from a set of system settings.
     */
    static syncFromSettings(settings: any[]) {
        const angle = settings.find(s => s.id === 'rackShadowAngle')?.currentValue;
        const dist = settings.find(s => s.id === 'rackShadowDistance')?.currentValue;
        const blur = settings.find(s => s.id === 'rackShadowBlur')?.currentValue;

        if (angle !== undefined || dist !== undefined || blur !== undefined) {
            this.updateGlobalLighting(angle, dist, blur);
        }
    }
}
