'use client';

/**
 * @purpose Renderiza una pestaña de cumplimiento para manifestos OMEGA, mostrando resultados de auditoría y problemas con opciones de navegación.
 * @purpose_en Renders a compliance panel for OMEGA manifests, displaying audit results and issues with navigation options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:710fg9
 * @lastUpdated 2026-06-20T14:40:47.465Z
 */

import { useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Download, ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info, Target, Layout, Zap, ArrowRight, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuditService } from '@/services/auditService';
import type { AuditResult, AuditIssue } from '@/omega-ui-core/types/audit';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

interface CompliancePanelProps {
  audit: AuditResult;
  manifest: OMEGA_Manifest;
  onNavigate?: (path: string) => void;
}

interface StatusConfigItem {
  color: string;
  bg: string;
  border: string;
  icon: LucideIcon;
  label: string;
}

const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  CERTIFIED: { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: ShieldCheck, label: 'CERTIFIED' },
  DRAFT: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: ShieldAlert, label: 'DRAFT' },
  CRITICAL_FAIL: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: ShieldX, label: 'FAILURE' }
};

type SeverityGroup = 'critical' | 'warning' | 'info';

interface GroupedIssue extends AuditIssue {
  _group: SeverityGroup;
}

function getGroup(issue: AuditIssue): SeverityGroup {
  const s = issue.severity;
  if (s === 'error') return 'critical';
  if (s === 'warning' || s === 'audit') return 'warning';
  return 'info';
}

const GROUP_CONFIG: Record<SeverityGroup, { icon: LucideIcon; label: string; color: string; bg: string; border: string }> = {
  critical: { icon: AlertTriangle, label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20' },
  warning:  { icon: AlertCircle, label: 'Warning',  color: 'text-yellow-400', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
  info:     { icon: Info,        label: 'Info',     color: 'text-blue-400', bg: 'bg-blue-500/5',   border: 'border-blue-500/20' },
};

export default function CompliancePanel({ audit, manifest, onNavigate }: CompliancePanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<SeverityGroup, boolean>>({
    critical: true,
    warning: false,
    info: false,
  });
  const [showGuidelines, setShowGuidelines] = useState(false);

  const toggleGroup = (group: SeverityGroup) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleDownload = () => {
    AuditService.downloadCertificationReport(manifest, audit);
  };

  const statusConfig = STATUS_CONFIG[audit.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DRAFT;

  // Group issues by severity
  const groupedIssues: Record<SeverityGroup, GroupedIssue[]> = { critical: [], warning: [], info: [] };
  for (const issue of audit.issues || []) {
    const group = getGroup(issue);
    groupedIssues[group].push({ ...issue, _group: group });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-[10.5px] font-sans select-none">
      <ComplianceHeader audit={audit} manifest={manifest} statusConfig={statusConfig} />

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
        <IssuesAccordion
          groupedIssues={groupedIssues}
          expandedGroups={expandedGroups}
          onToggleGroup={toggleGroup}
          onNavigate={onNavigate}
        />
        {audit.issues?.length === 0 && <ComplianceEmptyState />}
      </div>

      <GuidelinesSection show={showGuidelines} onToggle={() => setShowGuidelines(v => !v)} />
      <ComplianceFooter onDownload={handleDownload} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Header with score, progress bar, compliance matrix, and sync metrics */
function ComplianceHeader({ audit, manifest, statusConfig }: {
  audit: AuditResult; manifest: OMEGA_Manifest; statusConfig: StatusConfigItem;
}) {
  const StatusIcon = statusConfig.icon;
  return (
    <div className="shrink-0 p-2 border-b wb-outline wb-surface-subtle">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-6 h-6 rounded-xs border flex items-center justify-center ${statusConfig.border} ${statusConfig.bg}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black uppercase tracking-wider text-[10px] wb-text">Compliance</span>
            <span className={`text-[9px] font-mono font-black uppercase ${statusConfig.color}`}>{statusConfig.label}</span>
          </div>
          <div className="text-[8px] font-mono wb-text-muted truncate" title={manifest.metadata?.name || manifest.id}>{manifest.metadata?.name || manifest.id}</div>
        </div>
        <span className={`text-lg font-black font-mono ${statusConfig.color}`}>{audit.score}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 wb-surface-strong rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${audit.score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${statusConfig.color.replace('text-', 'bg-')}`}
        />
      </div>

      {/* Compliance matrix (2x2) */}
      <div className="grid grid-cols-2 gap-1 mt-1.5">
        {([
          { label: 'Governance', val: audit.checks.governance },
          { label: 'Integrity', val: audit.checks.integrity },
          { label: 'Technical', val: audit.checks.technical },
          { label: 'Aesthetic', val: audit.checks.aesthetic },
        ] as const).map(c => (
          <div
            key={c.label}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xs border ${
              c.val ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${c.val ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-[8px] font-black uppercase tracking-wider ${c.val ? 'text-green-500' : 'text-red-400'}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {/* Sync & Seal Metrics */}
      <div className="mt-1.5 border-t wb-outline pt-1.5 space-y-1 text-[8px] font-mono wb-text-muted">
        <div className="flex justify-between">
          <span className="uppercase">Metadata Density</span>
          <span className="text-primary font-bold">{manifest.metadata?.rack?.width || 12}HP</span>
        </div>
        <div className="flex justify-between">
          <span className="uppercase">WASM Runtime Sync</span>
          <span className={audit.isHashMatched ? 'text-green-500 font-bold' : 'text-red-400 font-bold'}>
            {audit.isHashMatched ? 'COHERENT' : 'DEGRADED'} ({audit.fingerprint?.slice(0, 8) || 'NONE'})
          </span>
        </div>
        <div className="flex justify-between items-center wb-surface-strong p-1 rounded-xs border wb-outline">
          <span className="uppercase font-bold">Certification Status</span>
          <span className={audit.isCompliant ? 'text-green-500 font-bold' : 'text-red-400 font-bold'}>
            {audit.isCompliant ? 'OMEGA_CERTIFIED' : 'CERTIFICATION_DENIED'}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Accordion groups of issues by severity */
function IssuesAccordion({ groupedIssues, expandedGroups, onToggleGroup, onNavigate }: {
  groupedIssues: Record<SeverityGroup, GroupedIssue[]>;
  expandedGroups: Record<SeverityGroup, boolean>;
  onToggleGroup: (group: SeverityGroup) => void;
  onNavigate?: ((path: string) => void) | undefined;
}) {
  return (
    <>
      {(Object.keys(GROUP_CONFIG) as SeverityGroup[]).map(group => {
        const issues = groupedIssues[group];
        if (issues.length === 0) return null;
        const cfg = GROUP_CONFIG[group];
        const isExpanded = expandedGroups[group];
        const GrpIcon = cfg.icon;

        return (
          <div key={group} className="flex flex-col border wb-outline rounded-xs overflow-hidden">
            <button
              onClick={() => onToggleGroup(group)}
              className={`flex items-center gap-1.5 px-2 py-1.5 ${cfg.bg} ${cfg.border} border-b wb-outline hover:wb-surface-hover transition-colors text-left`}
              aria-label={`${cfg.label} issues`}
            >
              {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              <GrpIcon className={`w-3 h-3 ${cfg.color}`} />
              <span className={`text-[9px] font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
              <span className="text-[8px] font-mono wb-text-muted ml-auto">{issues.length}</span>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  {issues.map((issue, idx) => (
                    <IssueCard key={idx} issue={issue} onNavigate={onNavigate} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
}

/** Empty state when all checks pass */
function ComplianceEmptyState() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center py-12 px-4 gap-4 border border-green-500/10 bg-green-500/5 rounded-sm mx-1.5 mt-1.5 relative overflow-hidden">
      <div className="relative">
        <ShieldCheck className="w-8 h-8 text-green-500 opacity-50 relative z-10" />
        <motion.div 
          animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute inset-0 bg-green-500 rounded-full blur-xl z-0"
        />
      </div>
      <div className="text-center space-y-1 relative z-10">
        <p className="text-green-500 text-[10px] font-black uppercase tracking-[0.3em]">System Certified</p>
        <p className="wb-text-muted text-[8px] uppercase font-bold tracking-wider max-w-[180px] mx-auto leading-normal">
          Hardware logic and architectural compliance verified under Aseptic Industrial Standard V7.2.3.
        </p>
      </div>
    </div>
  );
}

/** Collapsible guidelines section */
function GuidelinesSection({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col border wb-outline rounded-xs overflow-hidden mt-1.5 shrink-0 mx-1.5 mb-1.5">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2 py-1.5 bg-primary/5 border-b wb-outline hover:wb-surface-hover transition-colors text-left"
        aria-label={show ? 'Hide aseptic guidelines' : 'Show aseptic guidelines'}
      >
        {show ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
        <span className="text-[9px] font-black uppercase tracking-wider text-primary">Aseptic Guidelines v7.2</span>
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden bg-black/20 p-2 space-y-2 text-[9px] leading-relaxed wb-text-muted"
          >
            <div>
              <h4 className="font-bold text-primary/70 uppercase">WASM Binding</h4>
              <p className="italic">&quot;La gobernanza exige que cada componente tenga un Registry Role explícito vinculado a una dirección de memoria del contrato WASM.&quot;</p>
            </div>
            <div className="border-t wb-outline my-1" />
            <div>
              <h4 className="font-bold text-primary/70 uppercase">Spatial Integrity</h4>
              <p className="italic">&quot;La integridad espacial requiere que todos los elementos interactivos residan al menos a 12px de los bordes del rack para garantizar la paridad física.&quot;</p>
            </div>
            <div className="border-t wb-outline my-1" />
            <div>
              <h4 className="font-bold text-primary/70 uppercase">Identity Branding</h4>
              <p className="italic">&quot;La REGLA DE ORO (saturación 0.8) garantiza que la identidad visual se integre con el chasis industrial sin distraer de la funcionalidad técnica.&quot;</p>
            </div>
            <div className="border-t wb-outline my-1" />
            <div>
              <h4 className="font-bold text-primary/70 uppercase">Asset Governance</h4>
              <p className="italic">&quot;Cualquier activo faltante bloquea la exportación crítica. El HAZARD PATTERN es el único indicador aceptado para violaciones de integridad de recursos.&quot;</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Footer with export button */
function ComplianceFooter({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="shrink-0 p-2 border-t wb-outline wb-surface-subtle flex gap-1.5">
      <button
        onClick={onDownload}
        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xs bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-[9px] font-black uppercase tracking-wider transition-all"
        aria-label="Export certification report"
      >
        <Download className="w-3 h-3" />
        Export Cert
      </button>
    </div>
  );
}

// ── Issue Card (single issue row with accordion detail) ──────────────────

function IssueCard({ issue, onNavigate }: { issue: AuditIssue; onNavigate?: ((path: string) => void) | undefined }) {
  const [expanded, setExpanded] = useState(false);

  const severityColor = issue.severity === 'error'
    ? 'text-red-400 border-red-500/20'
    : issue.severity === 'warning' || issue.severity === 'audit'
      ? 'text-yellow-400 border-yellow-500/20'
      : 'text-blue-400 border-blue-500/20';

  const getRecommendation = (keyword: string) => {
    const recommendations: Record<string, string> = {
      era7_style: "Adjust the HP to an even number to ensure standard Eurorack alignment and industrial symmetry.",
      era7_identity: "Each entity must have a unique ID. Check for duplicate controls or jacks in the manifest logic.",
      era7_alignment: "Standardize positions to multiples of 5px. Use the grid snapping tool or manual coordinate entry.",
      era7_port_norm: "Follow the OMEGA color standard: Cyan for Audio/CV, Amber for Mod, White for Gate, Orange for MIDI.",
      era7_ux: "Provide physical units (Hz, dB, ms, semi, %) to ensure clarity for the end user in telemetry displays.",
      era7_integrity: "The component is outside the front panel. Check X/Y coordinates against the total HP width.",
      era7_binding: "The 'bind' key refers to a non-existent parameter in the WASM contract. Verify the contract.json exports.",
      era7_collision: "Increase the distance between these components to prevent overlap and ensure ergonomic clearance.",
      era7_ux_context: "The unit used does not match the parameter's semantic context. Use Hz for frequencies or semi for pitch."
    };
    return recommendations[keyword] || "Review the technical specification v7.2.3 for compliance details.";
  };

  const getCategory = (keyword: string) => {
    if (keyword === 'era7_identity' || keyword === 'era7_binding') return { label: 'Technical', icon: Zap, color: 'text-blue-400' };
    if (keyword === 'era7_integrity' || keyword === 'era7_collision' || keyword === 'era7_alignment') return { label: 'Spatial', icon: Layout, color: 'text-purple-400' };
    if (keyword === 'era7_style' || keyword === 'era7_port_norm' || keyword === 'era7_ux' || keyword === 'era7_ux_context') return { label: 'Governance', icon: ShieldCheck, color: 'text-[#00ff9d]' };
    return { label: 'Compliance', icon: Info, color: 'text-amber-400' };
  };

  const keyword = issue.keyword || '';
  const category = getCategory(keyword);
  const recommendation = getRecommendation(keyword);

  return (
    <div className="border-b wb-outline last:border-b-0">
      {/* Clickable row — toggle detail */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:wb-surface-hover transition-colors text-left"
        aria-label={expanded ? `Collapse ${issue.message}` : `Expand ${issue.message}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityColor.split(' ')[0]}`} />
        <span className="text-[9px] font-mono font-bold wb-text truncate flex-1" title={issue.message}>{issue.message}</span>
        {expanded ? <ChevronDown className="w-2 h-2 shrink-0 wb-text-muted" /> : <ChevronRight className="w-2 h-2 shrink-0 wb-text-muted" />}
      </button>

      {/* Detail panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden wb-surface-subtle"
          >
            <div className="px-3 pb-2.5 pt-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full wb-surface-strong text-[8px] font-black uppercase tracking-wider ${category.color}`}>
                  <category.icon className="w-2 h-2" />
                  {category.label}
                </div>
                {issue.path && (
                  <span className="text-[8px] font-mono wb-text-muted wb-surface-strong px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                    {issue.path}
                  </span>
                )}
              </div>

              {/* Technical Recommendation Box */}
              <div className="p-2 wb-surface-inset border wb-outline rounded-xs space-y-1">
                <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-primary/70">
                  <Target className="w-2 h-2" />
                  Recommendation
                </div>
                <p className="text-[9px] wb-text-muted font-medium italic leading-relaxed">
                  &quot;{recommendation}&quot;
                </p>
              </div>

              <div className="flex items-center justify-between text-[8px] font-mono wb-text-muted">
                {issue.code && <span>CODE: {issue.code}</span>}
                
                {/* Locate in Workbench */}
                {onNavigate && issue.path && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(issue.path!);
                    }}
                    className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-primary hover:wb-text transition-colors"
                    aria-label={`Locate in workbench: ${issue.message}`}
                  >
                    Locate <ArrowRight className="w-2 h-2" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
