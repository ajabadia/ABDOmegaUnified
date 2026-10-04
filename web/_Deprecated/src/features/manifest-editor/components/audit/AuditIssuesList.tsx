'use client';

/**
 * @purpose Renderiza una lista de problemas de auditoría categorizados por tipo en un editor de manifesto OMEGA.
 * @purpose_en Renders a list of audit issues categorized by type in an OMEGA manifest editor.
 * @refactorable true (contains multiple UI components and logic for categorization)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:6d1nba
 * @lastUpdated 2026-06-15T10:53:08.024Z
 */


import { 
  FileText, CheckCircle2 
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { AuditResult, AuditIssue } from '@/omega-ui-core/types/audit';

// Modular Sub-components
import InspectionCard from './InspectionCard';

interface AuditIssuesListProps {
  audit: AuditResult;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export default function AuditIssuesList({ audit, onNavigate, onClose }: AuditIssuesListProps) {
  // Grouping logic for categorization
  const categories = [
    { label: 'Technical Integrity', key: 'technical', keywords: ['era7_identity', 'era7_binding'] },
    { label: 'Spatial Architecture', key: 'spatial', keywords: ['era7_integrity', 'era7_collision', 'era7_alignment'] },
    { label: 'Governance & UX', key: 'governance', keywords: ['era7_style', 'era7_port_norm', 'era7_ux', 'era7_ux_context'] }
  ];

  return (
    <div className="flex-1 space-y-10">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">Diagnostic Inspection Log</h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono wb-text-muted">{audit.issues.length} Issues Detected</span>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-[10px] font-mono text-primary/60">Spec v7.2.3</span>
        </div>
      </div>

      <div className="space-y-12 pb-12">
        {audit.issues.length === 0 ? (
          <div className="p-16 border border-[#00ff9d]/10 bg-[#00ff9d]/2 rounded-sm flex flex-col items-center gap-6">
            <div className="relative">
              <CheckCircle2 className="w-16 h-16 text-[#00ff9d] opacity-40" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-[#00ff9d] rounded-full blur-2xl"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-[#00ff9d] text-lg font-black uppercase tracking-[0.4em]">System Certified</p>
              <p className="text-white/20 text-[10px] uppercase font-black tracking-widest max-w-xs mx-auto leading-relaxed">
                Hardware logic and architectural compliance verified under Aseptic Industrial Standard V7.2.3.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((cat: { label: string; key: string; keywords: string[] }) => {
              const catIssues = audit.issues.filter((i: AuditIssue) => i.code && cat.keywords.some(k => i.code?.includes(k)));
              if (catIssues.length === 0) return null;

              return (
                <div key={cat.key} className="space-y-4">
                  <div className="flex items-center gap-4 px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 shrink-0">{cat.label}</h4>
                    <div className="h-px bg-white/5 flex-1" />
                    <span className="text-[9px] font-mono text-white/10">{catIssues.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {catIssues.map((issue, idx) => (
                      <InspectionCard 
                        key={idx} 
                        issue={issue} 
                        onNavigate={onNavigate} 
                        onClose={onClose} 
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* UNKNOWN OR OTHER ISSUES */}
            {(() => {
              const otherIssues = audit.issues.filter((i: AuditIssue) => !categories.some(c => i.code && c.keywords.some(k => i.code?.includes(k))));
              if (otherIssues.length === 0) return null;
              return (
                <div className="space-y-4 opacity-60">
                   <div className="flex items-center gap-4 px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 shrink-0">General Compliance</h4>
                    <div className="h-px bg-white/5 flex-1" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {otherIssues.map((issue, idx) => (
                      <InspectionCard key={idx} issue={issue} onNavigate={onNavigate} onClose={onClose} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
