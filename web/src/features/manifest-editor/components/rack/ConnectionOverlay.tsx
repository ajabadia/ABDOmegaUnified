'use client';

/**
 * @purpose Renderiza una capa de overlay interactivo SVG para crear, visualizar y eliminar conexiones de modulación entre puertos en el viewport del rack.
 * @purpose_en Renders an interactive SVG overlay for creating, viewing, and deleting modulation connections between ports in the rack viewport.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:p3qiot
 * @lastUpdated 2026-06-20T09:43:45.418Z
 */

import { X } from 'lucide-react';
import type { OMEGA_Manifest, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';
import { useConnectionPositions } from './useConnectionPositions';
import { useConnectionDrag } from './useConnectionDrag';
import {
  MOD_TYPE_COLORS,
  SNAP_RADIUS,
  getModColor, getModLabel, buildConnectionPath,
} from './connectionOverlayUtils';

interface ConnectionOverlayProps {
  manifest: OMEGA_Manifest;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAddModulation: (mod: OMEGA_Modulation) => void;
  onRemoveModulation: (id: string) => void;
}

/**
 * ConnectionOverlay — Interactive SVG overlay for modulation connections.
 */
export default function ConnectionOverlay({
  manifest,
  containerRef,
  onAddModulation,
  onRemoveModulation,
}: ConnectionOverlayProps) {
  // ── Positions (handles + links from DOM) ───────────────────────────
  const {
    handles, links, dimensions, linksVersion,
    refreshPositions, entityLabelMap,
  } = useConnectionPositions(manifest, containerRef);

  // ── Drag + interaction state ───────────────────────────────────────
  const {
    dragState, hoveredLink, setHoveredLink,
    hoveredHandle, setHoveredHandle,
    handleHandleMouseDown, handleLinkClick,
    ghostX, ghostY, sourceHandle, nearbyHandle,
  } = useConnectionDrag(containerRef, handles, manifest, onAddModulation, onRemoveModulation, refreshPositions);

  const getEntityLabel = (id: string): string => entityLabelMap.get(id) || id;

  if (handles.length === 0 && links.length === 0 && !dragState) return null;

  return (
    <svg className="absolute inset-0 z-[60] pointer-events-none"
      style={{ overflow: 'visible', width: dimensions.w || '100%', height: dimensions.h || '100%' }}
    >
      <defs>
        <filter id="conn-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="conn-glow-strong">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="conn-glow-tooltip">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── EXISTING CONNECTION LINES ──────────────────────────────── */}
      {links.map((link, idx) => {
        const pathD = buildConnectionPath(link.sx, link.sy, link.tx, link.ty);
        const color = getModColor(link.type);
        const isHovered = hoveredLink === link.id;
        const sourceLabel = getEntityLabel(link.sourceId);
        const targetLabel = getEntityLabel(link.targetId);
        const typeLabel = getModLabel(link.type);

        return (
          <g key={`${link.id}-${linksVersion}`}
            style={{ animation: `conn-enter 0.3s ease-out both`, animationDelay: `${idx * 0.04}s` }}
          >
            {/* Invisible wide click target */}
            <path d={pathD} fill="none" stroke="transparent" strokeWidth={14}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => setHoveredLink(link.id)}
              onMouseLeave={() => setHoveredLink(null)}
              onClick={(e) => handleLinkClick(e, link.id)}
            />
            {/* Glow line */}
            <path d={pathD} fill="none" stroke={color}
              strokeWidth={isHovered ? 4 : 1.5}
              opacity={isHovered ? 0.6 : 0.3} filter="url(#conn-glow)"
            />
            {/* Solid line */}
            <path d={pathD} fill="none" stroke={color}
              strokeWidth={isHovered ? 2 : 0.8}
              opacity={isHovered ? 0.95 : 0.55}
            />
            {/* Animated dot on hover */}
            {isHovered && (
              <circle r={3} fill={color} opacity={0.9} filter="url(#conn-glow-strong)">
                <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
              </circle>
            )}

            {/* Tooltip on hover */}
            {isHovered && (
              <g>
                <rect x={(link.sx + link.tx) / 2 - 60} y={(link.sy + link.ty) / 2 - 32}
                  width={120} height={28} rx={3}
                  fill="rgba(5,5,5,0.92)" stroke={color} strokeWidth={0.5} strokeOpacity={0.5}
                  filter="url(#conn-glow-tooltip)"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => handleLinkClick(e, link.id)}
                />
                <text x={(link.sx + link.tx) / 2} y={(link.sy + link.ty) / 2 - 20}
                  fill="rgba(255,255,255,0.8)" fontSize="6" fontFamily="monospace" textAnchor="middle"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => handleLinkClick(e, link.id)}
                >
                  {sourceLabel.length > 10 ? sourceLabel.slice(0, 10) + '\u2026' : sourceLabel}
                  {' \u2192 '}
                  {targetLabel.length > 10 ? targetLabel.slice(0, 10) + '\u2026' : targetLabel}
                </text>
                <text x={(link.sx + link.tx) / 2} y={(link.sy + link.ty) / 2 - 10}
                  fill={color} fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => handleLinkClick(e, link.id)}
                >
                  {typeLabel} {' '}{'\u00B7'} {(link.amount || 0).toFixed(2)}
                </text>
              </g>
            )}

            {/* Delete button on hover */}
            {isHovered && (
              <foreignObject x={(link.sx + link.tx) / 2 - 8} y={(link.sy + link.ty) / 2 + 4}
                width={16} height={16} className="pointer-events-auto"
              >
                <div onClick={() => onRemoveModulation(link.id)}
                  className="w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"
                  title="Delete connection"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* ── DRAG GHOST LINE ────────────────────────────────────────── */}
      {dragState && sourceHandle && (
        <g style={{ animation: 'conn-enter 0.15s ease-out' }}>
          {/* Snap ring on nearby handle */}
          {nearbyHandle && nearbyHandle.id !== dragState.sourceId && (
            <g>
              <circle cx={nearbyHandle.x} cy={nearbyHandle.y} r={SNAP_RADIUS}
                fill="none" stroke={MOD_TYPE_COLORS.unipolar} strokeWidth={0.5}
                opacity={0.3} strokeDasharray="2 3"
              >
                <animate attributeName="r" values={`${SNAP_RADIUS - 2};${SNAP_RADIUS + 2};${SNAP_RADIUS - 2}`}
                  dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite" />
              </circle>
              <circle cx={nearbyHandle.x} cy={nearbyHandle.y} r={8}
                fill="rgba(0,240,255,0.1)" stroke="rgba(0,240,255,0.6)" strokeWidth={1.5} />
            </g>
          )}

          {/* Ghost line */}
          <line x1={sourceHandle.x} y1={sourceHandle.y} x2={ghostX} y2={ghostY}
            stroke={MOD_TYPE_COLORS.unipolar} strokeWidth={2} strokeDasharray="6 4"
            opacity={0.7} filter="url(#conn-glow-strong)"
            style={{ animation: 'conn-ghost-dash 0.6s linear infinite' }}
          />
          {/* Ghost endpoint dot */}
          <circle cx={ghostX} cy={ghostY} r={nearbyHandle ? 6 : 4}
            fill={nearbyHandle ? 'rgba(0,240,255,0.5)' : MOD_TYPE_COLORS.unipolar}
            opacity={0.8} filter="url(#conn-glow-strong)"
          >
            {nearbyHandle && (
              <animate attributeName="r" values="6;8;6" dur="0.8s" repeatCount="indefinite" />
            )}
          </circle>

          {/* Connection count preview */}
          {sourceHandle && (
            <text x={sourceHandle.x + 12} y={sourceHandle.y - 12}
              fill={MOD_TYPE_COLORS.unipolar} fontSize="5" fontFamily="monospace"
              opacity={0.6} className="pointer-events-none select-none"
            >
              {(links.filter(l => l.sourceId === dragState.sourceId || l.targetId === dragState.sourceId).length)}
            </text>
          )}
        </g>
      )}

      {/* ── PORT HANDLES ───────────────────────────────────────────── */}
      {handles.map(handle => {
        const isDragging = dragState?.sourceId === handle.id;
        const isNearbyTarget = nearbyHandle?.id === handle.id && !isDragging;
        const connectedLinks = links.filter(l => l.sourceId === handle.id || l.targetId === handle.id);
        const connectionCount = connectedLinks.length;
        const isSnapTarget = isNearbyTarget;

        return (
          <g key={handle.id}
            style={{ animation: !isSnapTarget ? 'conn-enter 0.25s ease-out both' : undefined }}
          >
            {/* Connection count badge */}
            {connectionCount > 0 && !isDragging && (
              <g>
                <circle cx={handle.x + 10} cy={handle.y - 10} r={7}
                  fill="rgba(0,0,0,0.7)" stroke={MOD_TYPE_COLORS.unipolar} strokeWidth={0.5} strokeOpacity={0.4}
                />
                <circle cx={handle.x + 10} cy={handle.y - 10} r={7}
                  fill="none" stroke={MOD_TYPE_COLORS.unipolar} strokeWidth={0.5} strokeOpacity={0.3}
                  style={{ animation: 'conn-pulse-badge 2s ease-in-out infinite' }}
                />
                <text x={handle.x + 10} y={handle.y - 7}
                  fill={MOD_TYPE_COLORS.unipolar} fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {connectionCount > 9 ? '9+' : connectionCount}
                </text>
              </g>
            )}

            {/* Draggable handle circle */}
            <circle cx={handle.x} cy={handle.y}
              r={isSnapTarget ? 10 : isDragging ? 8 : hoveredHandle === handle.id ? 7 : connectionCount > 0 ? 6 : 5}
              fill={isSnapTarget ? 'rgba(0,240,255,0.25)' : isDragging ? 'rgba(0,240,255,0.5)' : hoveredHandle === handle.id ? 'rgba(0,240,255,0.4)' : connectionCount > 0 ? 'rgba(0,240,255,0.25)' : 'rgba(255,255,255,0.12)'}
              stroke={isSnapTarget ? '#00f0ff' : isDragging ? '#00f0ff' : hoveredHandle === handle.id ? '#00f0ff' : connectionCount > 0 ? 'rgba(0,240,255,0.6)' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isSnapTarget ? 2 : isDragging ? 2 : hoveredHandle === handle.id ? 1.5 : 1.2}
              className="pointer-events-auto cursor-crosshair"
              data-port-handle-id={handle.id}
              onMouseDown={(e) => handleHandleMouseDown(e, handle.id)}
              onMouseEnter={() => setHoveredHandle(handle.id)}
              onMouseLeave={() => { if (dragState?.sourceId !== handle.id) setHoveredHandle(null); }}
            >
              {isSnapTarget && (
                <animate attributeName="r" values="10;12;10" dur="0.8s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Glow ring */}
            {(hoveredHandle === handle.id || connectionCount > 0) && !isDragging && !isSnapTarget && (
              <circle cx={handle.x} cy={handle.y} r={7}
                fill="none" stroke={MOD_TYPE_COLORS.unipolar} strokeWidth={0.5}
                opacity={hoveredHandle === handle.id ? 0.4 : 0.15}
              />
            )}

            {/* Label */}
            {!isDragging && !isSnapTarget && (
              <text x={handle.x + (handle.isInput ? -12 : 12)} y={handle.y + 3}
                fill={connectionCount > 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)'}
                fontSize="6" fontFamily="monospace"
                textAnchor={handle.isInput ? 'end' : 'start'}
                className="pointer-events-none select-none"
              >
                {handle.label.slice(0, 12)}
              </text>
            )}

            {/* Mini type indicator dots */}
            {connectionCount > 0 && !isDragging && (
              connectedLinks.slice(0, 3).map((link, i) => {
                const dotColor = getModColor(link.type);
                const angle = -90 + (i - (Math.min(connectedLinks.length, 3) - 1) / 2) * 20;
                const rad = (angle * Math.PI) / 180;
                const dotR = handle.isInput ? 10 : -10;
                const dotX = handle.x + Math.cos(rad) * dotR;
                const dotY = handle.y + Math.sin(rad) * dotR;
                return (
                  <circle key={link.id} cx={dotX} cy={dotY} r={1.5} fill={dotColor} opacity={0.6} />
                );
              })
            )}
          </g>
        );
      })}
    </svg>
  );
}
