'use client';

/**
 * @purpose Renderiza un bloque de diagnóstico que muestra señales con iconos y estatus.
 * @purpose_en Renders a diagnostic block that displays signals with icons and statuses.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:w5mel5
 * @lastUpdated 2026-06-15T11:06:21.867Z
 */

import { Activity, ShieldAlert, Zap } from 'lucide-react';

interface DiagnosticSignal {
  id: string;
  label: string;
  value: string | number | boolean;
  status?: 'ok' | 'warn' | 'fail';
  icon?: 'activity' | 'security' | 'power';
}

interface DiagnosticBlockProps {
  signals: DiagnosticSignal[];
  title?: string;
}

export default function DiagnosticBlock({ signals, title }: DiagnosticBlockProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ok': return 'text-primary';
      case 'warn': return 'text-amber-500';
      case 'fail': return 'text-red-500';
      default: return 'wb-text-muted';
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'activity': return Activity;
      case 'security': return ShieldAlert;
      case 'power': return Zap;
      default: return Activity;
    }
  };

  return (
    <div className="wb-surface-inset border wb-outline rounded-xs p-3 space-y-3">
      {title && (
        <div className="flex items-center gap-2 border-b wb-outline pb-2 mb-1">
          <Activity className="w-3 h-3 text-amber-500/50" />
          <span className="text-[7px] font-black uppercase tracking-widest text-amber-500/50">{title}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {signals.map((signal) => {
          const Icon = getIcon(signal.icon);
          return (
            <div key={signal.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 opacity-40">
                <Icon className="w-2.5 h-2.5" />
                <span className="text-[6px] font-black uppercase tracking-tight">{signal.label}</span>
              </div>
              <div className={`text-[9px] font-mono font-bold truncate ${getStatusColor(signal.status)}`}>
                {typeof signal.value === 'boolean' ? (signal.value ? 'YES' : 'NO') : signal.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
