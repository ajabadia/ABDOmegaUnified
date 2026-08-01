"use client";

/**
 * @purpose Renderiza un camino de señal dinámico con nodos y conexiones en tiempo real para las displays de telemetría modular y estática.
 * @purpose_en Renders a dynamic signal path with nodes and connections in real-time for modular and static telemetry displays.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1i0mjs1
 * @lastUpdated 2026-06-15T10:52:17.720Z
 */


import * as React from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  Cpu, 
  Zap, 
  Layers, 
  Mic, 
  Radio,
  Share2,
  Waves
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalNode {
  id: string;
  label: string;
  type: "input" | "oscillator" | "filter" | "vca" | "fx" | "output" | "matrix";
  description?: string;
}

interface SignalPathProps {
  path: {
    type: "static" | "modular";
    nodes: SignalNode[];
  };
  accentColor?: string;
  className?: string;
}

const NodeIcon = ({ type }: { type: SignalNode["type"] }) => {
  switch (type) {
    case "input": return <Mic size={16} />;
    case "oscillator": return <Waves size={16} />;
    case "filter": return <Zap size={16} />;
    case "vca": return <Layers size={16} />;
    case "fx": return <Radio size={16} />;
    case "matrix": return <Share2 size={16} />;
    case "output": return <Activity size={16} />;
    default: return <Cpu size={16} />;
  }
};

export function SignalPath({ path, accentColor = "var(--color-primary)", className }: SignalPathProps) {
  const isModular = path.type === "modular";

  return (
    <div className={cn("w-full space-y-8", className)}>
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary animate-pulse" />
          <span className="text-[10px] font-headline uppercase tracking-widest text-zinc-500">
            {isModular ? "Dynamic Matrix Telemetry" : "Signal Path Telemetry"}
          </span>
        </div>
        <div className="flex gap-2">
          <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-headline font-bold uppercase text-primary">
            {path.type} engine
          </div>
        </div>
      </div>

      <div className={cn(
        "relative py-12 px-6 overflow-hidden",
        isModular ? "grid grid-cols-2 md:grid-cols-3 gap-8" : "flex flex-col md:flex-row items-center justify-between gap-12"
      )}>
        {/* Background Grid Pattern for Modular */}
        {isModular && (
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: `radial-gradient(${accentColor} 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
        )}

        {path.nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <div className="relative group z-10">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center gap-4"
              >
                {/* Node Hexagon / Circle */}
                <div 
                  className="w-14 h-14 rounded-xl border border-white/10 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm group-hover:border-primary/50 transition-all shadow-lg"
                  style={{ boxShadow: i === 0 ? `0 0 20px ${accentColor}10` : 'none' }}
                >
                  <div className="text-zinc-500 group-hover:text-primary transition-colors">
                    <NodeIcon type={node.type} />
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h4 className="text-[10px] font-headline font-bold uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors">
                    {node.label}
                  </h4>
                  {node.description && (
                    <p className="text-[8px] font-body text-zinc-600 max-w-[80px] leading-tight">
                      {node.description}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Path Connection Line (Static only) */}
            {!isModular && i < path.nodes.length - 1 && (
              <div className="hidden md:block flex-1 h-px bg-white/5 relative overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
