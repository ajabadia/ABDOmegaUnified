'use client';

/**
 * @purpose Renderiza iconos de alineación y distribución para uso en el componente de vista previa del editor de manifesto OMEGA.
 * @purpose_en Renders alignment and distribution icons for use in the OMEGA manifest editor's viewport component.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:8,imports:0,sig:tk7a4h
 * @lastUpdated 2026-06-15T13:00:48.602Z
 */

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Alignment toolbar icons — SVG vector with `currentColor`.
 * Adapts automatically to theme (light/dark) without CSS filters.
 */

const baseProps = (size = 14) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16' as const,
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const AlignLeftIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size)} className={className}>
    <line x1="2.5" y1="1.5" x2="2.5" y2="14.5" />
    <rect x="4" y="2.5" width="6" height="3" fill="currentColor" stroke="none" />
    <rect x="4" y="6.5" width="9" height="3" fill="currentColor" stroke="none" />
    <rect x="4" y="10.5" width="4" height="3" fill="currentColor" stroke="none" />
  </svg>
);

export const AlignCenterHIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size)} className={className}>
    <line x1="8" y1="1.5" x2="8" y2="14.5" />
    <rect x="5" y="2.5" width="6" height="3" fill="currentColor" stroke="none" />
    <rect x="3.5" y="6.5" width="9" height="3" fill="currentColor" stroke="none" />
    <rect x="6" y="10.5" width="4" height="3" fill="currentColor" stroke="none" />
  </svg>
);

export const AlignRightIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size)} className={className}>
    <line x1="13.5" y1="1.5" x2="13.5" y2="14.5" />
    <rect x="6" y="2.5" width="6" height="3" fill="currentColor" stroke="none" />
    <rect x="3" y="6.5" width="9" height="3" fill="currentColor" stroke="none" />
    <rect x="8" y="10.5" width="4" height="3" fill="currentColor" stroke="none" />
  </svg>
);

export const DistributeVIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size)} className={className}>
    <line x1="2.5" y1="1.5" x2="2.5" y2="14.5" />
    <rect x="4" y="2" width="6" height="3.5" fill="currentColor" stroke="none" />
    <rect x="4" y="6.25" width="6" height="3.5" fill="currentColor" stroke="none" />
    <rect x="4" y="10.5" width="6" height="3.5" fill="currentColor" stroke="none" />
  </svg>
);

export const AlignTopIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size)} className={className}>
    <line x1="1.5" y1="2.5" x2="14.5" y2="2.5" />
    <rect x="2.5" y="4" width="3" height="6" fill="currentColor" stroke="none" />
    <rect x="6.5" y="4" width="3" height="9" fill="currentColor" stroke="none" />
    <rect x="10.5" y="4" width="3" height="4" fill="currentColor" stroke="none" />
  </svg>
);

export const AlignCenterVIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size)} className={className}>
    <line x1="1.5" y1="8" x2="14.5" y2="8" />
    <rect x="2.5" y="5" width="3" height="6" fill="currentColor" stroke="none" />
    <rect x="6.5" y="3.5" width="3" height="9" fill="currentColor" stroke="none" />
    <rect x="10.5" y="6" width="3" height="4" fill="currentColor" stroke="none" />
  </svg>
);

export const AlignBottomIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size)} className={className}>
    <line x1="1.5" y1="13.5" x2="14.5" y2="13.5" />
    <rect x="2.5" y="6" width="3" height="6" fill="currentColor" stroke="none" />
    <rect x="6.5" y="3" width="3" height="9" fill="currentColor" stroke="none" />
    <rect x="10.5" y="8" width="3" height="4" fill="currentColor" stroke="none" />
  </svg>
);

export const DistributeHIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size)} className={className}>
    <line x1="1.5" y1="2.5" x2="14.5" y2="2.5" />
    <rect x="2" y="4" width="3.5" height="6" fill="currentColor" stroke="none" />
    <rect x="6.25" y="4" width="3.5" height="6" fill="currentColor" stroke="none" />
    <rect x="10.5" y="4" width="3.5" height="6" fill="currentColor" stroke="none" />
  </svg>
);
