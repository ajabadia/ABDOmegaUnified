"use client";

/**
 * @purpose Gestiona un componente select de dropdown personalizable con características adicionales como etiqueta heredada y visualización de badge.
 * @purpose_en Manages a customizable dropdown select component with additional features such as inherited label and badge display.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:3,imports:1,sig:l88b5q
 * @lastUpdated 2026-06-15T12:59:38.489Z
 */

import { ChevronDown } from "lucide-react";

export type IndustrialSelectOption = {
  value: string | number;
  label: string;
};

export type IndustrialSelectProps = {
  value: string | number;
  onChange: (value: string) => void;
  options: IndustrialSelectOption[];

  placeholder?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;

  showInheritedBadge?: boolean;
  inheritedLabel?: string;
};

export function IndustrialSelect(props: IndustrialSelectProps) {
  const {
    value,
    onChange,
    options,
    placeholder,
    disabled,
    size = "sm",
    className = "",
    showInheritedBadge,
    inheritedLabel,
  } = props;

  const sizeStyles = {
    xs: "px-2 py-1 text-[8px]",
    sm: "px-3 py-2.5 text-[10px]",
    md: "px-3 py-3 text-[11px]",
  };

  return (
    <div className={`relative group ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={[
          "w-full wb-surface-subtle border wb-outline rounded-xs font-bold wb-text outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer pr-10",
          sizeStyles[size],
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/20",
        ].join(" ")}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0a0a0b] text-white">
            {opt.label}
          </option>
        ))}
      </select>
      
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover:text-primary/60 transition-colors">
        <ChevronDown className="w-3 h-3" />
      </div>

      {showInheritedBadge && (
        <div className="absolute top-0 right-10 -translate-y-1/2 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
          <span className="text-[6px] font-black uppercase text-primary/60 tracking-tighter">
            {inheritedLabel || "Inherited"}
          </span>
        </div>
      )}
    </div>
  );
}
