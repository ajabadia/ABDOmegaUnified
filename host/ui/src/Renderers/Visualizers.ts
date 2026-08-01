/**
 * OMEGA Era 7.2.3 - Visualizer Engine
 * Scope canvas drawing, terminal log listeners and animation loop.
 */
export interface VisualizerEntry {
    id: string;
    type: 'scope' | 'terminal';
    el: HTMLElement;
}

export class VisualizerEngine {
    private visualizers: VisualizerEntry[] = [];
    private rafHandle: number | null = null;

    /**
     * Scans content for scope/terminal displays and wires terminal log listeners.
     */
    init(content: HTMLElement): void {
        this.visualizers = [];
        content.querySelectorAll('.scope-display, .terminal-display').forEach((el: any) => {
            const type = el.classList.contains('scope-display') ? 'scope' : 'terminal';
            const bindId = el.dataset.bind;
            this.visualizers.push({ id: bindId, type, el });

            if (type === 'terminal') {
                this.setupTerminalListener(bindId, el);
            }
        });
    }

    start(): void {
        if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
        const loop = () => {
            this.updateVisualizers();
            this.rafHandle = requestAnimationFrame(loop);
        };
        this.rafHandle = requestAnimationFrame(loop);
    }

    destroy(): void {
        if (this.rafHandle) {
            cancelAnimationFrame(this.rafHandle);
            this.rafHandle = null;
        }
    }

    private setupTerminalListener(bindId: string, el: HTMLElement): void {
        const container = el.querySelector('.terminal-container');
        if (!container) return;

        // Listen for log events from the host (Era 7.2 Bridge)
        window.addEventListener('omega:TERMINALLOG', (e: any) => {
            const data = e.detail?.payload;
            if (data && data.bindId === bindId) {
                this.addTerminalLine(container, data.message);
            }
        });
    }

    private addTerminalLine(container: Element, message: string): void {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.textContent = `> ${message}`;
        container.appendChild(line);

        while (container.children.length > 50) {
            container.removeChild(container.firstChild!);
        }

        container.scrollTop = container.scrollHeight;
    }

    private updateVisualizers(): void {
        this.visualizers.filter(v => v.type === 'scope').forEach(v => {
            this.drawScope(v.el);
        });
    }

    private drawScope(el: HTMLElement): void {
        const canvas = el.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bindId = el.dataset.bind;
        const buffer = (window as any).omega_get_scope_buffer ? (window as any).omega_get_scope_buffer(bindId) : this.getMockWaveform();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = getComputedStyle(el).getPropertyValue('--scope-color').trim() || '#00ff88';
        ctx.lineWidth = 2;

        const step = canvas.width / (buffer.length - 1);
        for (let i = 0; i < buffer.length; i++) {
            const x = i * step;
            const y = (0.5 - (buffer[i] * 0.4)) * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    private getMockWaveform(): number[] {
        const points = 100;
        const result = [];
        const time = Date.now() * 0.005;
        for (let i = 0; i < points; i++) {
            result.push(Math.sin(time + (i * 0.2)));
        }
        return result;
    }
}
