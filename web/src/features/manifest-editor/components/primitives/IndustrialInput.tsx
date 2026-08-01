"use client";

/**
 * @purpose Renderiza un campo de entrada estilizado con propiedades personalizables para su uso en el editor de manifesto OMEGA.
 * @purpose_en Renders a styled input field with customizable properties for use in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:0nepmn
 * @lastUpdated 2026-06-20T09:43:36.514Z
 */

import * as React from "react";

export type IndustrialInputSize = "xs" | "sm" | "md";

export type IndustrialInputProps = {
  value: string | number;
  onChange: (value: string) => void;

  type?: ("text" | "number" | "password") | undefined;
  placeholder?: string | undefined;
  autoSelectOnFocus?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;

  size?: IndustrialInputSize | undefined;
  mono?: boolean | undefined;
  align?: ("left" | "center" | "right") | undefined;

  hasError?: boolean | undefined;
  className?: string | undefined;
  /** Accessible label for screen readers */
  ariaLabel?: string | undefined;
};

const baseStyles =
  "w-full wb-surface-subtle border wb-outline rounded-xs px-3 py-2 text-[10px] wb-text outline-none transition-all";

const sizeStyles: Record<IndustrialInputSize, string> = {
  xs: "px-2 py-1 text-[8px]",
  sm: "px-3 py-2 text-[10px]",
  md: "px-3 py-2.5 text-[11px]",
};

export function IndustrialInput(props: IndustrialInputProps) {
  const {
    value,
    onChange,
    type = "text",
    placeholder,
    autoSelectOnFocus,
    disabled,
    readOnly,
    size = "sm",
    mono,
    align = "left",
    hasError,
    className = "",
  } = props;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (autoSelectOnFocus) {
      e.target.select();
    }
  };

  const alignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  const errorClass = hasError
    ? "border-red-500/40 text-red-300 focus:border-red-500/60"
    : "focus:border-primary/40";

  const monoClass = mono ? "font-mono" : "font-bold";

  const disabledClass = disabled
    ? "opacity-50 cursor-not-allowed"
    : "hover:border-primary/20";

  return (
    <input
      type={type}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      aria-label={props.ariaLabel}
      className={[
        baseStyles,
        sizeStyles[size],
        alignClass,
        errorClass,
        monoClass,
        disabledClass,
        className,
      ].join(" ")}
    />
  );
}
