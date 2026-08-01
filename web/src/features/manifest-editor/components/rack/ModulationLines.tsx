'use client';

/**
 * @purpose Renderiza líneas animadas de SVG que muestran conexiones cruzadas de modulación entre puertos activos en el viewport del rack.
 * @purpose_en Renders animated SVG lines showing cross-modulation connections between active signal ports in the rack viewport.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:irsgbb
 * @lastUpdated 2026-06-15T12:59:48.405Z
 */

import { useEffect, useState } from 'react';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

interface ModulationLinesProps {
  /** IDs of ports that have active signals with cross-modulation */
  activePortIds: string[];
  /** Container element to scope DOM queries */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface ModulationLink {
  sourceId: string;
  targetId: string;
  /** Source port center in viewport coordinates */
  sx: number;
  sy: number;
  /** Target port center in viewport coordinates */
  tx: number;
  ty: number;
  /** Color based on signal type */
  color: string;
}

const SIGNAL_COLORS: Record<string, string> = {
  sine: '#00f0ff',
  square: '#ff8c00',
  saw: '#ff00ff',
  triangle: '#00ff88',
  pulse: '#ffcc00',
  pwm: '#ff6600',
  noise: '#8888ff',
  lfo_slow: '#00ffcc',
  sample_hold: '#ff4488',
  sequencer: '#44ff88',
  random_correlated: '#8844ff',
  adsr: '#ff8844',
  static: '#ffffff',
};

/**
 * ModulationLines (vR2)
 * Renders animated SVG lines showing cross-modulation connections
 * between active signal ports in the rack viewport.
 * Uses native SVG <animate> elements for smooth performance.
 */
export const ModulationLines = ({ activePortIds, containerRef }: ModulationLinesProps) => {
  const inputSignalService = getService(SERVICE_TOKENS.INPUT_SIGNAL_SERVICE);
  const [links, setLinks] = useState<ModulationLink[]>([]);
  const [tick, setTick] = useState(0);

  // Animate tick to trigger re-renders for pulse visuals (only when links exist)
  useEffect(() => {
    if (links.length === 0) return;
    const interval = setInterval(() => {
      setTick(t => (t + 1) % 60);
    }, 50); // ~20fps animation
    return () => clearInterval(interval);
  }, [links.length]);

  // Refresh port positions periodically and on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || activePortIds.length === 0) {
      setLinks([]);
      return;
    }

    const refreshPositions = () => {
      const newLinks: ModulationLink[] = [];

      activePortIds.forEach(portId => {
        const signal = inputSignalService.getActiveSignal(portId);
        if (!signal) return;

        const sourceEl = container.querySelector(`[id="uca-${portId}"]`);
        if (!sourceEl) return;

        const sourceRect = sourceEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const sx = sourceRect.left - containerRect.left + sourceRect.width / 2;
        const sy = sourceRect.top - containerRect.top + sourceRect.height / 2;

        // If this signal modulates another, draw a connection line
        if (signal.modSourceId && signal.modAmount && Math.abs(signal.modAmount) > 0.01) {
          const targetEl = container.querySelector(`[id="uca-${signal.modSourceId}"]`);
          if (targetEl) {
            const targetRect = targetEl.getBoundingClientRect();
            const tx = targetRect.left - containerRect.left + targetRect.width / 2;
            const ty = targetRect.top - containerRect.top + targetRect.height / 2;
            newLinks.push({
              sourceId: portId,
              targetId: signal.modSourceId,
              sx, sy, tx, ty,
              color: SIGNAL_COLORS[signal.type] || SIGNAL_COLORS.sine,
            });
          }
        }

        // Always add a self-indicator for active signal (pulsing dot above port)
        newLinks.push({
          sourceId: portId,
          targetId: portId,
          sx, sy,
          tx: sx, ty: sy,
          color: SIGNAL_COLORS[signal.type] || SIGNAL_COLORS.sine,
        });
      });

      setLinks(newLinks);
    };

    // Initial refresh
    refreshPositions();

    // Set up ResizeObserver for container
    const resizeObserver = new ResizeObserver(() => {
      refreshPositions();
    });
    resizeObserver.observe(container);

    // Periodic refresh (every 500ms for position updates during drag/resize)
    const intervalId = setInterval(refreshPositions, 500);

    return () => {
      resizeObserver.disconnect();
      clearInterval(intervalId);
    };
  }, [activePortIds, containerRef, inputSignalService]);

  // Animated pulse value based on tick
  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.2);
  const glowPulse = 0.3 + 0.3 * pulse;

  if (links.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 z-[100] pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="mod-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Dot marker for modulation path animation */}
        <filter id="dot-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {links.map((link, i) => {
        // Self-indicator: draw a small pulsing circle above the port
        if (link.sourceId === link.targetId) {
          return (
            <g key={i}>
              <circle
                cx={link.sx}
                cy={link.sy - 12}
                r={3 + pulse * 2}
                fill={link.color}
                opacity={glowPulse}
                filter="url(#mod-glow)"
              />
              <circle
                cx={link.sx}
                cy={link.sy - 12}
                r={2}
                fill={link.color}
                opacity={0.8}
              />
            </g>
          );
        }

        // Cross-modulation line with native SVG animation
        const midX = (link.sx + link.tx) / 2;
        const midY = Math.min(link.sy, link.ty) - 30; // Curve upward
        const pathD = `M ${link.sx} ${link.sy} Q ${midX} ${midY} ${link.tx} ${link.ty}`;

        return (
          <g key={i}>
            {/* Glow line */}
            <path
              d={pathD}
              fill="none"
              stroke={link.color}
              strokeWidth="1.5"
              opacity={0.3}
              strokeDasharray="4 4"
              filter="url(#mod-glow)"
            />
            {/* Solid line */}
            <path
              d={pathD}
              fill="none"
              stroke={link.color}
              strokeWidth="0.8"
              opacity={0.5}
              strokeDasharray="4 4"
            />
            {/* Animated dot using native SVG animateMotion */}
            <circle r="3" fill={link.color} opacity="0.9" filter="url(#dot-glow)">
              <animateMotion
                dur={`${2 + (i % 3) * 0.5}s`}
                repeatCount="indefinite"
                path={pathD}
              />
            </circle>
            {/* Second dot offset by half cycle */}
            <circle r="2" fill={link.color} opacity="0.5">
              <animateMotion
                dur={`${2 + (i % 3) * 0.5}s`}
                repeatCount="indefinite"
                path={pathD}
                begin={`${1 + (i % 3) * 0.25}s`}
              />
            </circle>
            {/* Port label */}
            <text
              x={midX}
              y={midY - 8}
              fill={link.color}
              opacity={0.4}
              fontSize="5"
              fontFamily="monospace"
              textAnchor="middle"
            >
              ↻ {link.sourceId.slice(0, 8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
