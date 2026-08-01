'use client';

/**
 * @purpose Renderiza un componente botón estándar personalizable para el Editor Manifesto OMEGA con estilos y funcionalidad personalizables.
 * @purpose_en Renders a standardized button component for the OMEGA Manifest Editor with customizable styles and functionality.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1gvpklt
 * @lastUpdated 2026-06-20T09:18:19.548Z
 */

import type { LucideIcon } from 'lucide-react';

interface IndustrialButtonProps {
  label: string;
  icon?: LucideIcon | undefined;
  onClick?: (() => void) | undefined;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | undefined;
  size?: 'xs' | 'sm' | 'md' | undefined;
  className?: string | undefined;
  title?: string | undefined;
}

/**
 * IndustrialButton
 * Standardized button for the OMEGA Manifest Editor.
 * Ensures consistent aesthetic across all sections and themes.
 */
export default function IndustrialButton({
  label,
  icon: Icon,
  onClick,
  variant = 'secondary',
  size = 'sm',
  className = '',
  title
}: IndustrialButtonProps) {
  
  const baseStyles = "flex items-center gap-2 font-black uppercase tracking-widest transition-all rounded-xs border group active:scale-95";
  
  const variantStyles = {
    primary: "bg-primary text-black border-primary hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]",
    secondary: "wb-surface-subtle wb-outline text-primary hover:wb-surface-strong hover:border-primary/40",
    ghost: "bg-transparent border-transparent text-primary/60 hover:text-primary wb-surface-subtle/0 hover:wb-surface-subtle",
    danger: "bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-500"
  };
  
  const sizeStyles = {
    xs: "px-1.5 py-1 text-[7px]",
    sm: "px-3 py-1.5 text-[8px]",
    md: "px-4 py-2 text-[10px]"
  };

  return (
    <button 
      onClick={onClick}
      aria-label={title || label}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      title={title}
    >
      {label && <span className={size === 'xs' ? 'hidden group-hover:block' : ''}>{label}</span>}
      {Icon && <Icon className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
    </button>
  );
}
