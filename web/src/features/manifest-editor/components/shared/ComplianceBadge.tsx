'use client';

/**
 * @purpose Renderiza una notificacion emergente que indica el estado de cumplimiento con los resultados de auditoria, incluyendo iconos, etiquetas y indicadores de salud.
 * @purpose_en Renders a badge indicating compliance status with an audit result, including icons, labels, and health indicators.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:qtt99h
 * @lastUpdated 2026-06-20T09:44:06.808Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, Award } from 'lucide-react';
import type { AuditResult } from '@/omega-ui-core/types/audit';

interface ComplianceBadgeProps {
  audit: AuditResult;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  CRITICAL_FAIL: {
    icon: <ShieldAlert className="w-4 h-4" />,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    label: 'GOVERNANCE FAIL',
    pulse: true
  },
  DRAFT: {
    icon: <Shield className="w-4 h-4" />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    label: 'DRAFT MODE',
    pulse: false
  },
  CERTIFIED: {
    icon: <Award className="w-4 h-4" />,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/40',
    label: 'CERTIFIED ERA 7',
    pulse: false
  }
};
 
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

export function ComplianceBadge({ audit, onClick }: ComplianceBadgeProps) {
  const observabilityService = getService(SERVICE_TOKENS.OBSERVABILITY_SERVICE);
  const { score, status } = audit;
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DRAFT;
  const [health, setHealth] = React.useState(observabilityService.getHealthReport());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setHealth(observabilityService.getHealthReport());
    }, 2000);
    return () => clearInterval(timer);
  }, [observabilityService]);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2 py-1 rounded-sm border ${config.bg} ${config.border} transition-all group relative overflow-visible`}
      aria-label={`Compliance: ${config.label} (${score}%)`}
    >
      {config.pulse && (
        <motion.div 
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 bg-red-500/20 pointer-events-none rounded-sm"
        />
      )}
      
      {/* Icon Area with hover pop-up */}
      <div className={`${config.color} relative group/status`}>
        {config.icon}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/95 border border-outline px-2 py-1 rounded-xs shadow-lg text-[7px] font-mono font-bold wb-text whitespace-nowrap opacity-0 pointer-events-none group-hover/status:opacity-100 transition-opacity z-[999] uppercase tracking-wider">
          {config.label} ({score}%)
        </div>
      </div>

      <div className="h-4 w-px bg-white/10" />

      {/* Latency & Health Indicator with hover pop-up */}
      <div className="flex items-center gap-2 relative group/health">
        <span className={`text-[8px] font-mono font-bold ${health.lastLatencyMs > 200 ? 'text-amber-400' : 'text-primary/60'}`}>
          {health.lastLatencyMs}ms
        </span>
        <div className={`w-1.5 h-1.5 rounded-full ${health.failureCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500/50'}`} />
        
        <div className="absolute top-8 right-0 bg-black/95 border border-outline px-2 py-1.5 rounded-xs shadow-lg text-[7px] font-mono font-bold wb-text whitespace-nowrap opacity-0 pointer-events-none group-hover/health:opacity-100 transition-opacity z-[999] flex flex-col gap-0.5 align-end uppercase">
          <span>Latency: {health.lastLatencyMs}ms</span>
          <span>Failures: {health.failureCount}</span>
        </div>
      </div>
    </motion.button>
  );
}

export default ComplianceBadge;
