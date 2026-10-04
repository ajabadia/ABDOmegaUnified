"use client";

/**
 * @purpose Renderiza un componente botón personalizable con variantes y tamaños, incluyendo indicación del estado de carga.
 * @purpose_en Renders a customizable button component with variants and sizes, including loading state indication.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:0,imports:3,sig:taxfvp
 * @lastUpdated 2026-06-15T10:50:51.180Z
 */


import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, style, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-background hover:brightness-110 cyan-bloom",
      secondary: "bg-surface text-foreground hover:bg-zinc-800",
      outline: "bg-transparent border border-outline hover:bg-white/5",
      ghost: "bg-transparent hover:bg-white/5",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-6 py-3 text-sm",
      lg: "px-8 py-4 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative inline-flex items-center justify-center font-headline font-bold uppercase tracking-widest transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={style as any}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
