'use client';

import { motion } from 'framer-motion';
import {
  CONTROL_DEFINITIONS, PORT_DEFINITIONS,
} from '../../constants/entityDefinitions';

interface ToolbarAddFlyoutProps {
  onAddEntity: (type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => void;
  onClose: () => void;
  onSetActiveTool: (tool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null) => void;
}

export default function ToolbarAddFlyout({
  onAddEntity,
  onClose,
  onSetActiveTool,
}: ToolbarAddFlyoutProps) {
  const addControl = (def: (typeof CONTROL_DEFINITIONS)[number]) => {
    onAddEntity('control', { type: def.type, size: def.size, ...def.template });
    onClose();
    onSetActiveTool('select');
  };

  const addJack = (label: string) => {
    onAddEntity('jack', { type: 'port', label });
    onClose();
    onSetActiveTool('select');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="absolute left-full top-0 ml-1.5 w-80 wb-surface border wb-outline shadow-2xl p-2 rounded-xs flex flex-col gap-2 z-50 cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[7px] font-black uppercase text-primary/80 px-1.5 pb-1 border-b wb-outline tracking-wider">
        Inject Component
      </div>

      <div className="grid grid-cols-2 gap-3 p-1">
        {/* Column 1: Primitives (Controls) */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[6px] font-black uppercase wb-text-muted tracking-widest border-b border-white/5 pb-0.5 mb-1">
            Primitives
          </div>

          {CONTROL_DEFINITIONS.map((def) => {
            const Icon = def.icon;
            const isHslider = def.type === 'slider-h';
            return (
              <PrimitiveBtn
                key={def.type}
                icon={<Icon className={`w-3 h-3 text-primary/70 ${isHslider ? 'rotate-90' : ''}`} />}
                label={def.label}
                onClick={() => addControl(def)}
              />
            );
          })}
        </div>

        {/* Column 2: Ports */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[6px] font-black uppercase wb-text-muted tracking-widest border-b border-white/5 pb-0.5 mb-1">
            Signal Ports
          </div>

          {PORT_DEFINITIONS.map((port) => {
            const PortIcon = port.icon;
            return (
              <PortGroup
                key={port.family}
                label={port.family}
                icon={<PortIcon className="w-2.5 h-2.5" />}
                color={port.color}
                hoverColor={port.hoverColor}
                onAddIn={() => addJack(port.inLabel)}
                onAddOut={() => addJack(port.outLabel)}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function PrimitiveBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PortGroup({
  label,
  icon,
  color,
  hoverColor,
  onAddIn,
  onAddOut,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  onAddIn: () => void;
  onAddOut: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 p-1 bg-white/2 rounded-xs border border-white/5">
      <div className={`text-[6px] font-black uppercase ${color} tracking-wider flex items-center gap-1`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={onAddIn}
          className={`px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 ${hoverColor} border border-white/5 transition-colors`}
          aria-label={`${label} input port`}
        >
          In
        </button>
        <button
          onClick={onAddOut}
          className={`px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 ${hoverColor} border border-white/5 transition-colors`}
          aria-label={`${label} output port`}
        >
          Out
        </button>
      </div>
    </div>
  );
}
