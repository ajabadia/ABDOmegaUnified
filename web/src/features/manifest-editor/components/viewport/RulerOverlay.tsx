'use client';

/**
 * @purpose Renderiza una capa de regla con guías horizontales y verticales para una posición precisa dentro del viewport del editor de manifesto OMEGA.
 * @purpose_en Renders a ruler overlay with horizontal and vertical guides for precise positioning within the OMEGA manifest editor viewport.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:qzn2cc
 * @lastUpdated 2026-06-20T09:44:47.359Z
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { GridGuide } from '@/omega-ui-core/types/rack';

// ── Categorized sub-interfaces ──────────────────────────────────────

interface ViewProps {
  showGuides?: boolean;
  toolbarHeight?: number | undefined;
  pan?: { x: number; y: number } | undefined;
  zoom?: number | undefined;
  rackWidth?: number | undefined;
  rackHeight?: number | undefined;
  uiTheme?: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast' | undefined;
  isLiveMode?: boolean;
}

interface GuidesProps {
  guides?: GridGuide[];
  onGuidesChange?: (guides: GridGuide[]) => void;
}

type RulerOverlayProps = ViewProps & GuidesProps;

const RULER_SIZE = 22;
const TICK_MAJOR = 50;
const TICK_MINOR = 10;
const DELETE_ZONE = 30;

function generateId(): string {
  return `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Hook: RAF-based rack position tracking ────────────────────────────
//
// We can't rely on React's render cycle to know when the rack has moved
// (free-pan updates pan via requestAnimationFrame, button-pan updates it
// synchronously, zoom changes scale, the flex parent re-centers on resize…).
// Instead, we sample the rack's actual DOM position on every animation
// frame and only push to state when it changes. This is order-of-magnitude
// more robust than any useEffect/useLayoutEffect strategy because it
// always reads the truth from the DOM, never from React's stale closure.
// ──────────────────────────────────────────────

function useRulerPositionTracking(wrapperRef: React.RefObject<HTMLDivElement | null>) {
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  const [baseRackPos, setBaseRackPos] = useState({ x: 0, y: 0 });
  const sectionRectRef = useRef({ left: 0, top: 0 });
  const baseRackPosRef = useRef(baseRackPos);
  const lastBasePosRef = useRef({ x: -1, y: -1 });
  const lastDimsRef = useRef({ w: 0, h: 0 });

  useEffect(() => { baseRackPosRef.current = baseRackPos; }, [baseRackPos]);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const section = wrapperRef.current?.closest('section');
      if (section) {
        const sr = section.getBoundingClientRect();
        const rackEl = section.querySelector<HTMLElement>('.rack-viewport');
        if (rackEl) {
          const rr = rackEl.getBoundingClientRect();
          const nx = rr.left - sr.left;
          const ny = rr.top - sr.top;
          if (nx !== lastBasePosRef.current.x || ny !== lastBasePosRef.current.y) {
            lastBasePosRef.current = { x: nx, y: ny };
            setBaseRackPos({ x: nx, y: ny });
          }
        }
        const nw = section.clientWidth;
        const nh = section.clientHeight;
        if (nw !== lastDimsRef.current.w || nh !== lastDimsRef.current.h) {
          lastDimsRef.current = { w: nw, h: nh };
          setDims({ w: nw, h: nh });
        }
        sectionRectRef.current = { left: sr.left, top: sr.top };
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [wrapperRef, setBaseRackPos, setDims]);

  return { dims, baseRackPos, sectionRectRef, baseRackPosRef };
}

// ── Hook: Guide creation and dragging ──────────────────────────────────

interface GuideDragState {
  creating: { orientation: 'horizontal' | 'vertical'; pos: number; inZone: boolean } | null;
  dragging: { id: string; orientation: 'horizontal' | 'vertical'; startPos: number; inZone: boolean } | null;
}

function useGuideDrag(
  showGuides: boolean,
  guides: GridGuide[],
  onGuidesChange: ((g: GridGuide[]) => void) | undefined,
  zoomRef: React.MutableRefObject<number>,
  baseRackPosRef: React.MutableRefObject<{ x: number; y: number }>,
  sectionRectRef: React.MutableRefObject<{ left: number; top: number }>,
) {
  const [creating, setCreating] = useState<GuideDragState['creating']>(null);
  const [dragging, setDragging] = useState<GuideDragState['dragging']>(null);

  // CREATING guides: mousedown on ruler
  const handleHorizontalRulerMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showGuides) return;
    e.preventDefault();
    const section = (e.currentTarget as HTMLElement).closest('section');
    if (!section) return;
    const sr = section.getBoundingClientRect();
    const z = zoomRef.current ?? 1;
    const origin = baseRackPosRef.current;
    const rackY = (e.clientY - sr.top - origin.y) / z;
    setCreating({ orientation: 'horizontal', pos: Math.round(rackY), inZone: false });
  }, [showGuides, zoomRef, baseRackPosRef]);

  const handleVerticalRulerMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showGuides) return;
    e.preventDefault();
    const section = (e.currentTarget as HTMLElement).closest('section');
    if (!section) return;
    const sr = section.getBoundingClientRect();
    const z = zoomRef.current ?? 1;
    const origin = baseRackPosRef.current;
    const rackX = (e.clientX - sr.left - origin.x) / z;
    setCreating({ orientation: 'vertical', pos: Math.round(rackX), inZone: false });
  }, [showGuides, zoomRef, baseRackPosRef]);

  // DRAGGING existing guides
  const handleGuideDragStart = useCallback((e: React.MouseEvent, guide: GridGuide) => {
    if (!showGuides) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging({
      id: guide.id,
      orientation: guide.orientation,
      startPos: guide.position,
      inZone: false,
    });
  }, [showGuides]);

  // Window-level mouse handlers
  useEffect(() => {
    if (!creating && !dragging) return;

    const handleMove = (e: MouseEvent) => {
      const sr = sectionRectRef.current;
      const bp = baseRackPosRef.current ?? { x: 0, y: 0 };
      const z = zoomRef.current ?? 1;

      if (creating) {
        if (creating.orientation === 'vertical') {
          const inZone = e.clientX < RULER_SIZE + DELETE_ZONE;
          const origin = bp;
          const rackX = (e.clientX - sr.left - origin.x) / z;
          setCreating(prev => prev ? { ...prev, pos: Math.round(rackX), inZone } : null);
        } else {
          const inZone = e.clientY < RULER_SIZE + DELETE_ZONE;
          const origin = bp;
          const rackY = (e.clientY - sr.top - origin.y) / z;
          setCreating(prev => prev ? { ...prev, pos: Math.round(rackY), inZone } : null);
        }
      }

      if (dragging) {
        if (dragging.orientation === 'vertical') {
          const inZone = e.clientX < RULER_SIZE + DELETE_ZONE;
          setDragging(prev => prev ? { ...prev, inZone } : null);
          if (onGuidesChange) {
            const origin = bp;
            const rackX = Math.round((e.clientX - sr.left - origin.x) / z);
            onGuidesChange(guides.map(g =>
              g.id === dragging.id ? { ...g, position: rackX } : g
            ));
          }
        } else {
          const inZone = e.clientY < RULER_SIZE + DELETE_ZONE;
          setDragging(prev => prev ? { ...prev, inZone } : null);
          if (onGuidesChange) {
            const origin = bp;
            const rackY = Math.round((e.clientY - sr.top - origin.y) / z);
            onGuidesChange(guides.map(g =>
              g.id === dragging.id ? { ...g, position: rackY } : g
            ));
          }
        }
      }
    };

    const handleUp = () => {
      if (creating) {
        if (!creating.inZone && onGuidesChange) {
          const newGuide: GridGuide = {
            id: generateId(),
            orientation: creating.orientation,
            position: creating.pos,
          };
          onGuidesChange([...guides, newGuide]);
        }
        setCreating(null);
      }

      if (dragging) {
        if (dragging.inZone && onGuidesChange) {
          onGuidesChange(guides.filter(g => g.id !== dragging.id));
        }
        setDragging(null);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [creating, dragging, guides, onGuidesChange, sectionRectRef, baseRackPosRef, zoomRef]);

  return {
    creating,
    setCreating,
    dragging,
    setDragging,
    handleHorizontalRulerMouseDown,
    handleVerticalRulerMouseDown,
    handleGuideDragStart,
  };
}

// ── Hook: Canvas drawing for both rulers ───────────────────────────────

function drawRulerTickMarks(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  size: number,
  orientation: 'horizontal' | 'vertical',
  baseRackPos: { x: number; y: number },
  zoom: number,
  toolbarHeight: number,
  creating: { orientation: 'horizontal' | 'vertical'; pos: number; inZone: boolean } | null,
) {
  // Read CSS custom properties from the canvas computed style
  const computed = getComputedStyle(ctx.canvas);
  const rulerBg = computed.getPropertyValue('--wb-surface-inset') || '#e0e0e0';
  const textColor = computed.getPropertyValue('--wb-text') || '#222';
  const textMuted = computed.getPropertyValue('--wb-text-muted') || 'rgba(0,0,0,0.4)';
  const outlineColor = computed.getPropertyValue('--wb-outline') || '#888';

  ctx.scale(dpr, dpr);
  ctx.fillStyle = rulerBg;

  if (orientation === 'horizontal') {
    ctx.fillRect(0, 0, size, RULER_SIZE);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, RULER_SIZE - 0.5);
    ctx.lineTo(size, RULER_SIZE - 0.5);
    ctx.stroke();
  } else {
    ctx.fillRect(0, 0, RULER_SIZE, size);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE - 0.5, 0);
    ctx.lineTo(RULER_SIZE - 0.5, size);
    ctx.stroke();
  }

  const z = zoom ?? 1;
  const tickStepPx = TICK_MINOR * z;
  const isHorizontal = orientation === 'horizontal';

  const startVal = isHorizontal
    ? Math.floor((RULER_SIZE - baseRackPos.x) / tickStepPx) * TICK_MINOR
    : Math.floor((toolbarHeight + RULER_SIZE - baseRackPos.y) / tickStepPx) * TICK_MINOR;

  const endVal = isHorizontal
    ? Math.ceil((size + RULER_SIZE - baseRackPos.x) / z)
    : Math.ceil((size + toolbarHeight + RULER_SIZE - baseRackPos.y) / z);

  if (isHorizontal) {
    ctx.textAlign = 'center';
    for (let dv = startVal; dv <= endVal; dv += TICK_MINOR) {
      const canvasX = baseRackPos.x + dv * z - RULER_SIZE;
      if (canvasX < -tickStepPx || canvasX > size + tickStepPx) continue;
      const isMajor = dv % TICK_MAJOR === 0;
      const tickH = isMajor ? 10 : 4;
      ctx.strokeStyle = isMajor ? textColor : textMuted;
      ctx.lineWidth = isMajor ? 1.5 : 0.7;
      ctx.beginPath();
      ctx.moveTo(canvasX + 0.5, RULER_SIZE - tickH);
      ctx.lineTo(canvasX + 0.5, RULER_SIZE);
      ctx.stroke();
      if (isMajor) {
        ctx.fillStyle = textColor;
        ctx.font = 'bold 8px Inter, monospace';
        ctx.fillText(`${dv}`, canvasX, RULER_SIZE - 12);
      }
    }

    if (creating?.orientation === 'horizontal') {
      const canvasY = baseRackPos.y + creating.pos * z - toolbarHeight - RULER_SIZE;
      ctx.fillStyle = 'rgba(0, 180, 255, 0.6)';
      ctx.fillRect(canvasY, 0, 2, RULER_SIZE);
    }
  } else {
    for (let dv = startVal; dv <= endVal; dv += TICK_MINOR) {
      const canvasY = baseRackPos.y + dv * z - toolbarHeight - RULER_SIZE;
      if (canvasY < -tickStepPx || canvasY > size + tickStepPx) continue;
      const isMajor = dv % TICK_MAJOR === 0;
      const tickW = isMajor ? 10 : 4;
      ctx.strokeStyle = isMajor ? textColor : textMuted;
      ctx.lineWidth = isMajor ? 1.5 : 0.7;
      ctx.beginPath();
      ctx.moveTo(RULER_SIZE - tickW, canvasY + 0.5);
      ctx.lineTo(RULER_SIZE, canvasY + 0.5);
      ctx.stroke();
      if (isMajor) {
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = 'bold 8px Inter, monospace';
        ctx.translate(12, canvasY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`${dv}`, 0, 0);
        ctx.restore();
      }
    }

    if (creating?.orientation === 'vertical') {
      const canvasX = baseRackPos.x + creating.pos * z - RULER_SIZE;
      ctx.fillStyle = 'rgba(0, 180, 255, 0.6)';
      ctx.fillRect(0, canvasX, RULER_SIZE, 2);
    }
  }
}

function useRulerCanvas(
  dims: { w: number; h: number },
  creating: { orientation: 'horizontal' | 'vertical'; pos: number; inZone: boolean } | null,
  pan: { x: number; y: number } | undefined,
  zoom: number,
  baseRackPos: { x: number; y: number },
  toolbarHeight: number,
  rackWidth: number,
  rackHeight: number,
  uiTheme: string | undefined,
  horizontalRef: React.RefObject<HTMLCanvasElement | null>,
  verticalRef: React.RefObject<HTMLCanvasElement | null>,
) {
  // Horizontal ruler drawing
  useEffect(() => {
    const canvas = horizontalRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = dims.w - RULER_SIZE;
    canvas.width = w * dpr;
    canvas.height = RULER_SIZE * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${RULER_SIZE}px`;

    drawRulerTickMarks(ctx, dpr, w, 'horizontal', baseRackPos, zoom, toolbarHeight, creating);
  }, [dims.w, creating, pan, zoom, baseRackPos, toolbarHeight, rackWidth, rackHeight, uiTheme, horizontalRef]);

  // Vertical ruler drawing
  useEffect(() => {
    const canvas = verticalRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const h = dims.h - RULER_SIZE;
    canvas.width = RULER_SIZE * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${RULER_SIZE}px`;
    canvas.style.height = `${h}px`;

    drawRulerTickMarks(ctx, dpr, h, 'vertical', baseRackPos, zoom, toolbarHeight, creating);
  }, [dims.h, creating, pan, zoom, baseRackPos, toolbarHeight, rackWidth, rackHeight, uiTheme, verticalRef]);
}

// `baseRackPos` now stores the rack's direct visual top-left in section coords
// (post-transform). It is re-measured on every pan/zoom change so the ruler
// tick marks and guide overlays stay locked to the rack at any zoom level.

export default function RulerOverlay({
  showGuides = false,
  guides = [],
  onGuidesChange,
  toolbarHeight = 0,
  pan,
  zoom = 1,
  rackWidth = 800,
  rackHeight = 400,
  uiTheme = 'dark',
  isLiveMode = false,
}: RulerOverlayProps) {
  const horizontalRef = useRef<HTMLCanvasElement>(null);
  const verticalRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ── Hook: RAF-based position tracking ────────────────────────────
  const { dims, baseRackPos, sectionRectRef, baseRackPosRef } = useRulerPositionTracking(wrapperRef);

  // ── Hook: Guide creation/dragging ────────────────────────────────
  const {
    creating, dragging,
    handleHorizontalRulerMouseDown,
    handleVerticalRulerMouseDown,
    handleGuideDragStart,
  } = useGuideDrag(showGuides, guides, onGuidesChange, zoomRef, baseRackPosRef, sectionRectRef);

  // ── Hook: Canvas drawing ─────────────────────────────────────────
  useRulerCanvas(dims, creating, pan, zoom, baseRackPos, toolbarHeight ?? 0, rackWidth, rackHeight, uiTheme, horizontalRef, verticalRef);

  // ── Derived values ───────────────────────────────────────────────
  const origin = baseRackPos;
  const th = toolbarHeight ?? 0;
  const z = zoom ?? 1;

  // ── Pre-computed overlays ────────────────────────────────────────
  let creatingLine: React.ReactNode = null;
  if (creating) {
    const screenPos = creating.orientation === 'vertical'
      ? Math.round(origin.x + creating.pos * z)
      : Math.round(origin.y + creating.pos * z - th);
    const lineStyle: React.CSSProperties = creating.orientation === 'vertical'
      ? { left: screenPos, top: RULER_SIZE, bottom: 0, width: 1, backgroundColor: creating.inZone ? 'rgba(255, 80, 80, 0.7)' : 'rgba(0, 180, 255, 0.7)' }
      : { top: screenPos, left: RULER_SIZE, right: 0, height: 1, backgroundColor: creating.inZone ? 'rgba(255, 80, 80, 0.7)' : 'rgba(0, 180, 255, 0.7)' };
    creatingLine = <div className="absolute pointer-events-none" style={lineStyle} />;
  }

  const guideElements: React.ReactNode[] = [];
  if (showGuides) {
    for (const guide of guides) {
      const isVertical = guide.orientation === 'vertical';
      const isDragging = dragging?.id === guide.id;
      const inDeleteZone = isDragging && dragging?.inZone;
      const screenPos = Math.round(isVertical
        ? origin.x + guide.position * z
        : origin.y + guide.position * z - th);
      const style: React.CSSProperties = isVertical
        ? { position: 'absolute', left: screenPos, top: RULER_SIZE, bottom: 0, width: 1, cursor: 'ew-resize' }
        : { position: 'absolute', top: screenPos, left: RULER_SIZE, right: 0, height: 1, cursor: 'ns-resize' };
      guideElements.push(
        <div
          key={guide.id}
          className="absolute transition-shadow"
          style={{
            ...style,
            backgroundColor: inDeleteZone ? 'rgba(255, 80, 80, 0.8)' : isDragging ? 'rgba(0, 180, 255, 0.9)' : 'rgba(0, 180, 255, 0.7)',
            boxShadow: inDeleteZone ? '0 0 8px rgba(255, 80, 80, 0.6)' : isDragging ? '0 0 8px rgba(0, 180, 255, 0.6)' : 'none',
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => handleGuideDragStart(e, guide)}
        />
      );
    }
  }

  if (isLiveMode) return null;

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-[60]"
      style={{
        visibility: showGuides ? 'visible' : 'hidden',
        pointerEvents: 'none',
        top: toolbarHeight,
      }}
    >
      <canvas
        ref={horizontalRef}
        className="absolute"
        style={{ top: 0, left: RULER_SIZE, height: RULER_SIZE, cursor: showGuides ? 'crosshair' : 'default', pointerEvents: showGuides ? 'auto' : 'none' }}
        onMouseDown={handleHorizontalRulerMouseDown}
      />
      <canvas
        ref={verticalRef}
        className="absolute"
        style={{ top: RULER_SIZE, left: 0, width: RULER_SIZE, cursor: showGuides ? 'crosshair' : 'default', pointerEvents: showGuides ? 'auto' : 'none' }}
        onMouseDown={handleVerticalRulerMouseDown}
      />
      <div
        className="absolute top-0 left-0 flex items-center justify-center"
        style={{ width: RULER_SIZE, height: RULER_SIZE, backgroundColor: 'var(--wb-surface-inset)', borderBottom: '1px solid var(--wb-outline)', borderRight: '1px solid var(--wb-outline)' }}
      >
        <div className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: 'var(--wb-text-muted)' }} />
      </div>
      {creatingLine}
      {guideElements}
    </div>
  );
}
