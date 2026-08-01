/**
 * @purpose Renderiza una etiqueta de atajo reutilizable para el pie de footer del OMEGA Workbench.
 * @purpose_en Renders a reusable keyboard shortcut badge for the OMEGA Workbench footer.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:0,imports:1,sig:1xprppi
 * @lastUpdated 2026-06-20T09:40:28.809Z
 */

/**
 * ShortcutBadge — Reusable keyboard shortcut badge for the OMEGA Workbench footer.
 * Eliminates the 9× duplication of inline kbd markup + state classes in WorkbenchFooter.
 */

import React from 'react';

interface ShortcutBadgeProps {
  /** Ordered key labels, e.g. ['Ctrl', 'Z'] or ['Ctrl', 'Shift', 'Z'] */
  keys: string[];
  onClick?: () => void;
  disabled?: boolean;
  /** Tailwind responsive utility, e.g. 'hidden md:flex'. Defaults to 'flex' (always visible). */
  responsive?: string;
  /** When true, applies primary-color highlight (e.g. for active tab or available action) */
  active?: boolean;
  title?: string;
}

const ShortcutBadge: React.FC<ShortcutBadgeProps> = ({
  keys,
  onClick,
  disabled = false,
  responsive = 'flex',
  active = false,
  title,
}) => {
  /**
   * NOTE: `flex` is NOT in baseClass. The `responsive` prop provides the display utility
   * (defaults to `'flex'`). This avoids a CSS cascade bug where `flex` would override
   * `hidden` on badges with responsive classes like `hidden md:flex`.
   */
  const baseClass =
    'items-center gap-1 px-1 py-0.5 rounded-xs border text-[6px] font-mono font-bold tracking-wider shrink-0 transition-all';

  let stateClass: string;
  if (disabled) {
    stateClass = 'border-white/5 bg-transparent text-white/10 cursor-not-allowed';
  } else if (active) {
    stateClass = 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20';
  } else {
    stateClass = 'border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${responsive} ${baseClass} ${stateClass}`}
      title={title}
      aria-label={title || `${keys.join('+')} shortcut`}
    >
      {keys.map((key, i) => (
        <React.Fragment key={key}>
          {i > 0 && <span className="text-white/20">+</span>}
          <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </button>
  );
};

export default ShortcutBadge;
