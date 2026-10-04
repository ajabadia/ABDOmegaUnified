"use client";

/**
 * @purpose Renderiza una matriz de especificaciones técnicas agrupadas por categorías utilizando una estructura de tabla semántica con animaciones para mejorar la legibilidad y accesibilidad.
 * @purpose_en Renders a technical specifications matrix grouped by categories using a semantic table structure with animations for better readability and accessibility.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:kzvw38
 * @lastUpdated 2026-06-15T10:52:22.990Z
 */


import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpecItem {
  label: string;
  value: string;
}

interface SpecGroup {
  group: string;
  items: SpecItem[];
}

interface SpecsMatrixProps {
  specs: SpecGroup[];
  className?: string;
}

/**
 * SpecsMatrix Component
 * Industrial standard for presenting technical specifications.
 * Grouped by category for better technical readability.
 * a11y: Uses semantic table structure with ARIA roles.
 */
export function SpecsMatrix({ specs, className }: SpecsMatrixProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-12", className)} role="region" aria-label="Technical Specifications">
      {specs.map((group, groupIdx) => (
        <motion.div
          key={group.group}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIdx * 0.1 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <h3 className="font-headline text-xl font-bold uppercase tracking-widest border-b border-primary/20 pb-4 flex items-center justify-between">
            {group.group}
            <span className="text-[10px] text-zinc-600 font-headline font-normal">Section 0{groupIdx + 1}</span>
          </h3>
          
          <table className="w-full border-collapse">
            <caption className="sr-only">{group.group} Details</caption>
            <tbody className="divide-y divide-white/5">
              {group.items.map((item) => (
                <tr key={item.label} className="group">
                  <th className="py-4 text-left text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-zinc-500 group-hover:text-primary transition-colors">
                    {item.label}
                  </th>
                  <td className="py-4 text-right text-sm font-headline font-black text-foreground group-hover:text-white transition-colors">
                    {item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ))}
    </div>
  );
}
