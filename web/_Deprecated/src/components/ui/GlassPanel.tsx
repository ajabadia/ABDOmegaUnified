"use client";

/**
 * @purpose Renderiza un componente panel de vidrio que responde a eventos de desplazamiento del ratón con escalado y cambios de color de borde.
 * @purpose_en Renders a glass panel component that responds to hover events with scaling and border color changes.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:0,imports:3,sig:1pz9sl5
 * @lastUpdated 2026-06-15T10:51:53.481Z
 */


import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  hoverEffect?: boolean;
  accent?: boolean;
}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, hoverEffect = false, accent = false, children, style, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverEffect ? { scale: 1.01, borderColor: "rgba(0, 240, 255, 0.3)" } : {}}
        className={cn(
          "glass-panel relative rounded-md p-6 transition-colors duration-500",
          accent && "border-l-2 border-l-primary",
          className
        )}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={style as any}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export { GlassPanel };
