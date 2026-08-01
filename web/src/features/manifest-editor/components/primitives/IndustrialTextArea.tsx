"use client";

/**
 * @purpose Renderiza un componente textarea personalizable con propiedades ajustables para tamaño, estilo de fuente, manejo de errores y apariencia.
 * @purpose_en Renders a styled textarea component with customizable properties for size, font style, error handling, and appearance.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:an0t37
 * @lastUpdated 2026-06-15T12:59:43.340Z
 */

;

export type IndustrialTextAreaProps = {
  value: string;
  onChange: (value: string) => void;

  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;

  size?: ("sm" | "md") | undefined;
  mono?: boolean | undefined;
  className?: string | undefined;

  hasError?: boolean | undefined;
  rows?: number | undefined;
};

export function IndustrialTextArea(props: IndustrialTextAreaProps) {
  const {
    value,
    onChange,
    placeholder,
    disabled,
    readOnly,
    size = "sm",
    mono = true,
    className = "",
    hasError,
    rows = 4,
  } = props;

  const baseStyles =
    "w-full wb-surface-subtle border wb-outline rounded-xs px-3 py-2 text-[10px] wb-text outline-none transition-all resize-none custom-scrollbar";

  const sizeStyles = {
    sm: "text-[10px]",
    md: "text-[11px]",
  };

  const errorClass = hasError
    ? "border-red-500/40 text-red-300 focus:border-red-500/60"
    : "focus:border-primary/40";

  const monoClass = mono ? "font-mono" : "font-bold";

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      rows={rows}
      className={[
        baseStyles,
        sizeStyles[size],
        errorClass,
        monoClass,
        className,
      ].join(" ")}
    />
  );
}
