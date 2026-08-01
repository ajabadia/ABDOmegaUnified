'use client';

/**
 * @purpose Renderiza una visualización de onda estilo osciloscopio en tiempo real utilizando canvas, mostrando lecturas de frecuencia y amplitud desde un servicio de señal de entrada.
 * @purpose_en Renders a real-time oscilloscope-style waveform visualization using canvas, displaying frequency and amplitude readouts from an input signal service.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:mhdcu5
 * @lastUpdated 2026-06-20T09:44:01.767Z
 */

import { useEffect, useRef, useState } from 'react';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

interface SimulationScopeProps {
  portId: string;
  width?: number;
  height?: number;
  /** Color of the waveform line */
  color?: string;
  /** Background color */
  bgColor?: string;
}

/**
 * SimulationScope (vR2)
 * Real-time oscilloscope-style waveform visualization using canvas.
 * Reads signal values from inputSignalService at display refresh rate.
 * Includes frequency and amplitude readout overlay.
 */
export const SimulationScope = ({
  portId,
  width,
  height = 64,
  color = '#00f0ff',
  bgColor = '#000000',
}: SimulationScopeProps) => {
  const inputSignalService = getService(SERVICE_TOKENS.INPUT_SIGNAL_SERVICE);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ freq: 0, amp: 0, min: 0, max: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = containerRef.current;
    const actualWidth = width ?? parent?.clientWidth ?? 256;

    // Set canvas dimensions
    canvas.width = actualWidth * 2; // 2x for retina
    canvas.height = height * 2;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(2, 2);

    // Initialize buffer with zeros
    if (bufferRef.current.length === 0) {
      bufferRef.current = new Array(actualWidth).fill(0);
    }

    // Metrics tracking
    let lastZeroCrossing = 0;
    let metricsInterval = 0;
    // These are tracked via the buffer directly in the metrics update block below

    let animationId = 0;
    const render = () => {
      if (!ctx || !canvas) return;

      const signal = inputSignalService.getActiveSignal(portId);
      if (!signal) {
        ctx.clearRect(0, 0, actualWidth, height);
        ctx.strokeStyle = '#ffffff10';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(actualWidth, height / 2);
        ctx.stroke();
        animationId = requestAnimationFrame(render);
        return;
      }

      // Get current value
      const value = inputSignalService.getSignalValue(portId);

      // Shift buffer and add new value
      bufferRef.current.push(value);
      if (bufferRef.current.length > actualWidth) {
        bufferRef.current.shift();
      }

      // Track metrics every ~20 frames (~300ms at 60fps)
      metricsInterval++;
      if (metricsInterval >= 20) {
        metricsInterval = 0;
        // Track min/max from buffer
        const bufMin = Math.min(...bufferRef.current);
        const bufMax = Math.max(...bufferRef.current);

        // Zero-crossing frequency estimation
        const prev = bufferRef.current[bufferRef.current.length - 2] ?? 0;
        if (prev < 0 && value >= 0) {
          const now = performance.now();
          if (lastZeroCrossing > 0) {
            const period = (now - lastZeroCrossing) / 1000;
            const freqEst = 1 / period;
            if (freqEst > 0.1 && freqEst < 5000) {
              setMetrics({
                freq: Math.round(freqEst),
                amp: Math.abs(bufMax - bufMin),
                min: bufMin,
                max: bufMax,
              });
            }
          }
          lastZeroCrossing = now;
        }
      }

      // Draw
      ctx.clearRect(0, 0, actualWidth, height);

      // Grid lines
      ctx.strokeStyle = '#ffffff08';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(actualWidth, y);
        ctx.stroke();
      }
      // Center line
      ctx.strokeStyle = '#ffffff15';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(actualWidth, height / 2);
      ctx.stroke();

      // Waveform
      const centerY = height / 2;
      const ampScale = height * 0.4;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.beginPath();

      for (let x = 0; x < bufferRef.current.length; x++) {
        const val = bufferRef.current[x] ?? 0;
        const y = centerY - val * ampScale;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Glow effect (second pass with softer line)
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < bufferRef.current.length; x++) {
        const val = bufferRef.current[x] ?? 0;
        const y = centerY - val * ampScale;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // R2 — Metrics overlay text
      ctx.fillStyle = `${color}66`;
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${metrics.freq}Hz`, 4, 10);
      ctx.textAlign = 'right';
      ctx.fillText(`${(metrics.amp * 100).toFixed(0)}%`, actualWidth - 4, 10);

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    rafRef.current = animationId;

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [portId, width, height, color, metrics.amp, metrics.freq, inputSignalService]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ background: bgColor, borderRadius: '2px' }}
      />
    </div>
  );
};
