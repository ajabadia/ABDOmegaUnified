/**
 * @purpose Renderiza una notificacion emergente con el estado actual de sincronizacion de simulacion, incluyendo un icono, etiqueta y botón de resincronizar forzado para estados de error.
 * @purpose_en Renders a badge displaying the current simulation synchronization status with an icon, label, and optional force resync button for error states.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:1u7ura9
 * @lastUpdated 2026-06-17T22:30:08.710Z
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { SimulationSyncStatus } from '../../hooks/useSimulationBridge';

/**
 * OMEGA Simulation Status Badge (Phase 9.1)
 * High-fidelity telemetry indicator for the Live Loop synchronization state.
 */

interface SimulationStatusBadgeProps {
  status: SimulationSyncStatus;
  lastSyncAt: number | null;
  onForceResync: () => void;
}

export const SimulationStatusBadge: React.FC<SimulationStatusBadgeProps> = ({
  status,
  lastSyncAt,
  onForceResync
}) => {
  const getConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: RefreshCw,
          label: 'Syncing',
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10',
          border: 'border-yellow-400/20',
          animate: true
        };
      case 'in-sync':
        return {
          icon: CheckCircle2,
          label: 'In Sync',
          color: 'text-green-400',
          bg: 'bg-green-400/10',
          border: 'border-green-400/20',
          animate: false
        };
      case 'degraded':
        return {
          icon: Zap,
          label: 'Degraded',
          color: 'text-orange-400',
          bg: 'bg-orange-400/10',
          border: 'border-orange-400/20',
          animate: false
        };
      case 'error':
        return {
          icon: AlertTriangle,
          label: 'Sync Error',
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          border: 'border-red-400/20',
          animate: false
        };
      default:
        return {
          icon: Activity,
          label: 'Live Loop',
          color: 'text-white/20',
          bg: 'bg-white/5',
          border: 'border-white/10',
          animate: false
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border wb-outline bg-black/40 backdrop-blur-md">
      <div className={`flex items-center gap-2 ${config.bg} ${config.border} border px-2 py-0.5 rounded-full transition-all`}>
        <motion.div
          animate={config.animate ? { rotate: 360 } : {}}
          transition={config.animate ? { repeat: Infinity, duration: 2, ease: "linear" } : {}}
        >
          <Icon className={`w-3 h-3 ${config.color}`} />
        </motion.div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${config.color}`}>
          {config.label}
        </span>
      </div>

      <AnimatePresence>
        {lastSyncAt && (
          <motion.span 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[8px] font-bold text-white/20 uppercase"
          >
            {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </motion.span>
        )}
      </AnimatePresence>

      {status === 'error' && (
        <button 
          onClick={onForceResync}
          className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
          title="Force Manual Resync"
          aria-label="Force manual resync"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
