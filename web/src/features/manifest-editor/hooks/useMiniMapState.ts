'use client';

/**
 * @purpose Gestiona el estado y la lógica para el componente RackMiniMap en el editor de manifest OMEGA, incluyendo la visibilidad, el filtrado por tipo y la funcionalidad de desplazamiento y zoom.
 * @purpose_en Manages the state and logic for the RackMiniMap component in the OMEGA manifest editor, including visibility, kind filtering, and pan/zoom functionality.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:4,imports:4,sig:100hreb
 * @lastUpdated 2026-06-19T18:56:16.596Z
 */

import { useState, useCallback, useRef, useEffect, useMemo, startTransition } from 'react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { useViewportRect } from '@/features/manifest-editor/hooks/useViewportRect';
import type { FlattenedNode } from '@/features/manifest-editor/components/viewport/MiniMapNodes';

// ── Constants ─────────────────────────────────────────────────────────

const MINI_MAP_MAX_W = 184;
const MINI_MAP_MAX_H = 184;
const LS_KEY_HIDDEN_KINDS = 'omega-mini-map-hidden-kinds';
const LS_KEY_PANEL_OFFSET = 'omega-mini-map-panel-offset';
const URL_PARAM_HIDE = 'hide';
const SNAP_THRESHOLD = 8;

export const PANEL_CSS_TOP = 40;
export const PANEL_CSS_RIGHT = 10;
const PANEL_CLAMP_TOP_MAX = -20;
const PANEL_CLAMP_MIN_VISIBLE_LEFT = 70;
const PANEL_CLAMP_MIN_VISIBLE_BOTTOM = 60;

// ── Helpers ───────────────────────────────────────────────────────────

function flattenTree(tree: OmegaNode | undefined | null): FlattenedNode[] {
  if (!tree) return [];
  const result: FlattenedNode[] = [];
  const walk = (node: OmegaNode) => {
    if (node.layout?.pos && node.layout?.size) {
      result.push({
        id: node.id,
        kind: node.kind,
        label: (node.meta?.label as string) || node.id,
        x: node.layout.pos.x,
        y: node.layout.pos.y,
        w: node.layout.size.width,
        h: node.layout.size.height,
      });
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  };
  walk(tree);
  return result;
}

// ── Hook ──────────────────────────────────────────────────────────────

interface UseMiniMapStateProps {
  manifest: OMEGA_Manifest;
  zoom: number;
  pan: { x: number; y: number };
  onPan: (dx: number, dy: number) => void;
  rackWidth: number;
  rackHeight: number;
  containerWidth: number;
  containerHeight: number;
  isVisibleProp: boolean | undefined;
  onToggleVisible: (() => void) | undefined;
}

export interface MiniMapState {
  isVisible: boolean;
  showKindFilter: boolean;
  setShowKindFilter: React.Dispatch<React.SetStateAction<boolean>>;
  panelOffset: { x: number; y: number };
  handleHeaderMouseDown: (e: React.MouseEvent) => void;
  setPanelOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  toggleVisibility: () => void;
  hiddenKinds: Set<string>;
  toggleKindFilter: (kind: string) => void;
  setHiddenKinds: React.Dispatch<React.SetStateAction<Set<string>>>;
  availableKinds: string[];
  isDraggingVisual: boolean;
  isSnapped: boolean;
  isAtTopLimit: boolean;
  isMiniMapFocused: boolean;
  setIsMiniMapFocused: React.Dispatch<React.SetStateAction<boolean>>;
  scale: number;
  miniW: number;
  miniH: number;
  offsetX: number;
  offsetY: number;
  nodes: FlattenedNode[];
  viewportRect: { x: number; y: number; w: number; h: number };
  handleMiniMapClick: (e: React.MouseEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
  panelRef: React.RefObject<HTMLDivElement | null>;
  miniMapRef: React.RefObject<HTMLDivElement | null>;
}

export function useMiniMapState({
  manifest,
  zoom,
  pan,
  onPan,
  rackWidth,
  rackHeight,
  containerWidth,
  containerHeight,
  isVisibleProp,
  onToggleVisible,
}: UseMiniMapStateProps): MiniMapState {
  const [localIsVisible, setLocalIsVisible] = useState(true);
  const isVisible = isVisibleProp !== undefined ? isVisibleProp : localIsVisible;
  const [showKindFilter, setShowKindFilter] = useState(false);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const [isDraggingVisual, setIsDraggingVisual] = useState(false);
  const [isSnapped, setIsSnapped] = useState(false);
  const [isMiniMapFocused, setIsMiniMapFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hiddenKinds, setHiddenKinds] = useState<Set<string>>(new Set());

  const panelRef = useRef<HTMLDivElement>(null);
  const isDraggingPanel = useRef(false);
  const panelDragStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0, pw: 0, ph: 0, panelW: 0, panelH: 0 });
  const isFirstMountRef = useRef(true);
  const didDragRef = useRef(false);
  const mouseUpHandledRef = useRef(false);
  const panRef = useRef(pan);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number } | null>(null);

  // Derived: panel is at the top clamp limit
  const isAtTopLimit = panelOffset.y === PANEL_CLAMP_TOP_MAX;

  // Read panel offset from localStorage on client-side mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_PANEL_OFFSET);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          startTransition(() => setPanelOffset(parsed));
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Clamp persisted offset on mount
  useEffect(() => {
    if (containerWidth > 0) {
      startTransition(() => setPanelOffset((prev) => ({
        x: Math.max(-(containerWidth - PANEL_CLAMP_MIN_VISIBLE_LEFT), Math.min(PANEL_CSS_RIGHT, prev.x)),
        y: Math.max(PANEL_CLAMP_TOP_MAX, Math.min(containerHeight - (PANEL_CSS_TOP + PANEL_CLAMP_MIN_VISIBLE_BOTTOM), prev.y)),
      })));
    }
  }, [containerWidth, containerHeight]);

  // Persist panel offset to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_PANEL_OFFSET, JSON.stringify(panelOffset));
    } catch { /* ignore */ }
  }, [panelOffset]);

  // Panel drag-to-reposition (window-level)
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingPanel.current) return;
      if (e.buttons !== 1) { isDraggingPanel.current = false; setIsDraggingVisual(false); setIsSnapped(false); return; }
      const dx = e.clientX - panelDragStart.current.mouseX;
      const dy = e.clientY - panelDragStart.current.mouseY;

      let newX = panelDragStart.current.offsetX + dx;
      let newY = panelDragStart.current.offsetY + dy;

      const { pw, ph, panelW, panelH } = panelDragStart.current;
      let snapped = false;
      if (pw > 0 && ph > 0) {
        const visualLeft = pw - panelW - PANEL_CSS_RIGHT + newX;
        const visualTop = PANEL_CSS_TOP + newY;

        if (Math.abs(visualLeft) < SNAP_THRESHOLD) {
          newX = -(pw - panelW - PANEL_CSS_RIGHT);
          snapped = true;
        }
        if (Math.abs(PANEL_CSS_RIGHT - newX) < SNAP_THRESHOLD) {
          newX = PANEL_CSS_RIGHT;
          snapped = true;
        }
        if (Math.abs(visualTop) < SNAP_THRESHOLD) {
          newY = -PANEL_CSS_TOP;
          snapped = true;
        }
        const bottomGap = ph - (visualTop + panelH);
        if (Math.abs(bottomGap) < SNAP_THRESHOLD) {
          newY = ph - PANEL_CSS_TOP - panelH;
          snapped = true;
        }
      }

      if (pw > 0 && ph > 0) {
        newX = Math.max(-(pw - PANEL_CLAMP_MIN_VISIBLE_LEFT), Math.min(PANEL_CSS_RIGHT, newX));
        newY = Math.max(PANEL_CLAMP_TOP_MAX, Math.min(ph - PANEL_CSS_TOP - PANEL_CLAMP_MIN_VISIBLE_BOTTOM, newY));
      }

      setPanelOffset({ x: newX, y: newY });
      setIsSnapped(snapped);
    };

    const handleUp = () => {
      isDraggingPanel.current = false;
      setIsDraggingVisual(false);
      setIsSnapped(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    isDraggingPanel.current = true;
    setIsDraggingVisual(true);
    const panelEl = panelRef.current;
    let pw = 0, ph = 0, panelW = 0, panelH = 0;
    if (panelEl) {
      const parentEl = panelEl.parentElement;
      if (parentEl) {
        const pr = parentEl.getBoundingClientRect();
        pw = pr.width;
        ph = pr.height;
        panelW = panelEl.offsetWidth;
        panelH = panelEl.offsetHeight;
      }
    }
    panelDragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: panelOffset.x,
      offsetY: panelOffset.y,
      pw: pw || containerWidth,
      ph: ph || containerHeight,
      panelW,
      panelH,
    };
  }, [panelOffset, containerWidth, containerHeight]);

  // Sync hiddenKinds to localStorage + URL query param
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      try {
        const url = new URL(window.location.href);
        const raw = url.searchParams.get(URL_PARAM_HIDE);
        if (raw) {
          const kinds = raw.split(',').map((s) => s.trim()).filter(Boolean);
          if (kinds.length > 0) {
            startTransition(() => setHiddenKinds(new Set(kinds)));
            return;
          }
        }
      } catch { /* ignore */ }
      try {
        const raw = localStorage.getItem(LS_KEY_HIDDEN_KINDS);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            startTransition(() => setHiddenKinds(new Set(arr)));
            return;
          }
        }
      } catch { /* ignore */ }
    }

    try {
      const arr = Array.from(hiddenKinds);
      localStorage.setItem(LS_KEY_HIDDEN_KINDS, JSON.stringify(arr));
    } catch { /* ignore */ }
    try {
      const url = new URL(window.location.href);
      if (hiddenKinds.size > 0) {
        url.searchParams.set(URL_PARAM_HIDE, Array.from(hiddenKinds).join(','));
      } else {
        url.searchParams.delete(URL_PARAM_HIDE);
      }
      window.history.replaceState(null, '', url.toString());
    } catch { /* ignore */ }
  }, [hiddenKinds]);

  // Sync panRef to latest pan value
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Compute mini-map scale
  const scale = useMemo(() => {
    if (rackWidth <= 0 || rackHeight <= 0) return 0.15;
    return Math.min(MINI_MAP_MAX_W / rackWidth, MINI_MAP_MAX_H / rackHeight, 0.3);
  }, [rackWidth, rackHeight]);

  const miniW = rackWidth * scale;
  const miniH = rackHeight * scale;

  // Center offsets
  const offsetX = useMemo(() => (MINI_MAP_MAX_W - miniW) / 2, [miniW]);
  const offsetY = useMemo(() => (MINI_MAP_MAX_H - miniH) / 2, [miniH]);

  // Flatten nodes filtered by hidden kinds
  const nodes = useMemo(() => {
    const all = flattenTree(manifest.ui?.tree);
    if (hiddenKinds.size === 0) return all;
    return all.filter((n) => !hiddenKinds.has(n.kind));
  }, [manifest.ui?.tree, hiddenKinds]);

  // Viewport indicator rect
  const rackRect = useViewportRect({
    zoom,
    pan,
    containerWidth,
    containerHeight,
    rackWidth,
    rackHeight,
  });

  const viewportRect = useMemo(
    () => ({
      x: rackRect.left * scale,
      y: rackRect.top * scale,
      w: rackRect.width * scale,
      h: rackRect.height * scale,
    }),
    [rackRect, scale],
  );

  // Convert mini-map pixel to pan coordinates
  const miniCoordToPan = useCallback(
    (miniX: number, miniY: number) => {
      const rackX = miniX / scale;
      const rackY = miniY / scale;
      return {
        x: rackWidth / 2 - rackX,
        y: rackHeight / 2 - rackY,
      };
    },
    [scale, rackWidth, rackHeight],
  );

  // Click to navigate on mini-map background
  const handleMiniMapClick = useCallback(
    (e: React.MouseEvent) => {
      if (mouseUpHandledRef.current) {
        mouseUpHandledRef.current = false;
        return;
      }
      const rect = miniMapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left - 8 - offsetX;
      const clickY = e.clientY - rect.top - 8 - offsetY;
      const newPan = miniCoordToPan(clickX, clickY);
      onPan(newPan.x - panRef.current.x, newPan.y - panRef.current.y);
    },
    [miniCoordToPan, onPan, offsetX, offsetY],
  );

  // Mouse down on viewport indicator (start drag)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
    },
    [pan],
  );

  // Viewport drag (window-level)
  useEffect(() => {
    if (!isDragging || !dragStartRef.current) return;

    const handleMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      didDragRef.current = true;
      const rect = miniMapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dxPx = e.clientX - dragStartRef.current.x;
      const dyPx = e.clientY - dragStartRef.current.y;
      const rackDx = dxPx / scale;
      const rackDy = dyPx / scale;
      onPan(rackDx, rackDy);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startPanX: dragStartRef.current.startPanX + rackDx,
        startPanY: dragStartRef.current.startPanY + rackDy,
      };
    };

    const handleUp = (e: MouseEvent) => {
      mouseUpHandledRef.current = true;
      setIsDragging(false);
      if (!didDragRef.current && dragStartRef.current && miniMapRef.current) {
        const p = panRef.current;
        const rect = miniMapRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left - 8 - offsetX;
        const clickY = e.clientY - rect.top - 8 - offsetY;
        const rackX = clickX / scale;
        const rackY = clickY / scale;
        onPan(rackWidth / 2 - rackX - p.x, rackHeight / 2 - rackY - p.y);
      }
      didDragRef.current = false;
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, scale, onPan, offsetX, offsetY, rackWidth, rackHeight]);

  const toggleVisibility = useCallback(() => {
    if (onToggleVisible) {
      onToggleVisible();
    } else {
      setLocalIsVisible((prev) => !prev);
    }
  }, [onToggleVisible]);

  // Collect all distinct node kinds
  const availableKinds = useMemo(() => {
    const all = flattenTree(manifest.ui?.tree);
    const kinds = new Set(all.map((n) => n.kind));
    return Array.from(kinds).sort();
  }, [manifest.ui?.tree]);

  const toggleKindFilter = useCallback((kind: string) => {
    setHiddenKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }, []);

  return {
    isVisible,
    showKindFilter,
    setShowKindFilter,
    panelOffset,
    setPanelOffset,
    handleHeaderMouseDown,
    toggleVisibility,
    hiddenKinds,
    toggleKindFilter,
    setHiddenKinds,
    availableKinds,
    isDraggingVisual,
    isSnapped,
    isAtTopLimit,
    isMiniMapFocused,
    setIsMiniMapFocused,
    scale,
    miniW,
    miniH,
    offsetX,
    offsetY,
    nodes,
    viewportRect,
    handleMiniMapClick,
    handleMouseDown,
    isDragging,
    panelRef,
    miniMapRef,
  };
}
