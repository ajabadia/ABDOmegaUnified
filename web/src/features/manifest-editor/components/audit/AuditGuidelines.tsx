'use client';

/**
 * @purpose Renderiza un componente que muestra directrices de auditoría para manifestaciones OMEGA en un formato visualmente atractivo.
 * @purpose_en Renders a component displaying audit guidelines for OMEGA manifests in a visually appealing format.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:uda5io
 * @lastUpdated 2026-06-15T10:53:04.005Z
 */


import { Terminal } from 'lucide-react';

export default function AuditGuidelines() {
  return (
    <div className="p-6 bg-primary/5 border border-primary/10 rounded-sm space-y-4">
      <div className="flex items-center gap-3">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Aseptic Guidelines v7.2</span>
      </div>
      <div className="grid grid-cols-2 gap-6">
         <div className="space-y-2">
            <h4 className="text-[8px] font-black text-primary/60 uppercase tracking-widest">WASM Binding</h4>
            <p className="text-[9px] font-bold wb-text leading-relaxed italic">
              &quot;La gobernanza ERA 4 exige que cada componente tenga un Registry Role explícito vinculado a una dirección de memoria del contrato WASM.&quot;
            </p>
         </div>
         <div className="space-y-2">
            <h4 className="text-[8px] font-black text-primary/60 uppercase tracking-widest">Spatial Integrity</h4>
            <p className="text-[9px] font-bold wb-text leading-relaxed italic">
              &quot;La integridad espacial requiere que todos los elementos interactivos residan al menos a 12px de los bordes del rack para garantizar la paridad física.&quot;
            </p>
         </div>
         <div className="space-y-2">
            <h4 className="text-[8px] font-black text-primary/60 uppercase tracking-widest">Identity Branding</h4>
            <p className="text-[9px] font-bold wb-text leading-relaxed italic">
              &quot;La REGLA DE ORO (saturación 0.8) garantiza que la identidad visual se integre con el chasis industrial sin distraer de la funcionalidad técnica.&quot;
            </p>
         </div>
         <div className="space-y-2">
            <h4 className="text-[8px] font-black text-primary/60 uppercase tracking-widest">Asset Governance</h4>
            <p className="text-[9px] font-bold wb-text leading-relaxed italic">
              &quot;Cualquier activo faltante bloquea la exportación crítica. El HAZARD PATTERN es el único indicador aceptado para violaciones de integridad de recursos.&quot;
            </p>
         </div>
      </div>
    </div>
  );
}
