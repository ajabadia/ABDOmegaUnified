"use client";

/**
 * @purpose Renderiza un componente de campo personalizable con indicadores de estado y mensajes de validación para uso en el editor de manifesto OMEGA.
 * @purpose_en Renders a customizable field component with status indicators and validation messages for use in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:3,imports:2,sig:pb4ssj
 * @lastUpdated 2026-06-20T09:43:31.574Z
 */

import * as React from "react";
import { Info, Lock, AlertTriangle, type LucideIcon } from "lucide-react";

export type FieldStatus = "default" | "warning" | "error";

export type IndustrialFieldProps = {
  label: string;
  description?: string | undefined;
  icon?: LucideIcon | undefined;
  children: React.ReactNode;

  required?: boolean | undefined;
  inlineLabel?: boolean | undefined;
  className?: string | undefined;

  status?: FieldStatus | undefined;
  errorMessage?: string | undefined;
  warningMessage?: string | undefined;

  lockedByTemplate?: boolean | undefined;
  lockedReason?: string | undefined;

  highlightKey?: string | undefined;
  isHighlighted?: ((key: string) => boolean) | undefined;

  onHelp?: (() => void) | undefined;
};

export function IndustrialField(props: IndustrialFieldProps) {
  const {
    label,
    description,
    icon: Icon,
    children,
    required,
    inlineLabel,
    className = "",
    status = "default",
    errorMessage,
    warningMessage,
    lockedByTemplate,
    lockedReason,
    highlightKey,
    isHighlighted,
    onHelp,
  } = props;

  const isHighlightedField = highlightKey && isHighlighted?.(highlightKey);

  const wrapperHighlight =
    isHighlightedField
      ? "border-amber-500 ring-1 ring-amber-500 animate-pulse"
      : "border-transparent";

  const statusBorder =
    status === "error"
      ? "border-red-500/40"
      : status === "warning"
      ? "border-amber-500/30"
      : "";

  const lockedBadge =
    lockedByTemplate &&
    "bg-amber-500/20 text-amber-400 border-amber-500/40";

  const containerBase =
    "w-full space-y-1.5";

  const labelRowBase =
    "flex items-center justify-between gap-2";

  const labelBase =
    "text-[8px] font-black uppercase wb-text-muted tracking-wider ml-1 flex items-center gap-1";

  const descriptionBase =
    "text-[8px] wb-text-muted font-bold uppercase tracking-wider italic leading-tight px-1";

  const capsuleBase =
    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[7px] font-black uppercase";

  const statusRowBase =
    "flex items-center gap-1 text-[8px] font-black uppercase tracking-tight";

  const statusColor =
    status === "error"
      ? "text-red-400"
      : status === "warning"
      ? "text-amber-400"
      : "wb-text-muted";

  return (
    <div className={[containerBase, className].join(" ")}>
      {/* Label + badges */}
      <div
        className={
          inlineLabel ? `${labelRowBase} items-center` : `${labelRowBase} items-start`
        }
      >
        <div className="flex items-center gap-1">
          {Icon && (
            <Icon className="w-3 h-3 text-primary/60" />
          )}
          <span className={labelBase}>
            {label}
            {required && <span className="text-red-500 ml-0.5 font-black">*</span>}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {lockedByTemplate && (
            <span className={[capsuleBase, lockedBadge].join(" ")}>
              <Lock className="w-2 h-2" />
              <span>Locked</span>
            </span>
          )}
          {onHelp && (
            <button
              type="button"
              onClick={onHelp}
              aria-label={`Help: ${label}`}
              className="p-1 hover:text-primary transition-colors opacity-40 hover:opacity-100"
            >
              <Info className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {description && (
        <p className={descriptionBase}>{description}</p>
      )}

      {/* Field surface wrapper */}
      <div
        className={[
          "transition-all",
          wrapperHighlight,
          statusBorder,
        ].join(" ")}
      >
        {children}
      </div>

      {/* Status / validation messages */}
      {status === "error" && errorMessage && (
        <div className={[statusRowBase, statusColor, "mt-1 ml-1"].join(" ")}>
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {status === "warning" && warningMessage && (
        <div className={[statusRowBase, statusColor, "mt-1 ml-1"].join(" ")}>
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>{warningMessage}</span>
        </div>
      )}

      {lockedByTemplate && lockedReason && (
        <p className="text-[7px] wb-text-muted uppercase tracking-[0.1em] font-bold italic ml-1 opacity-40">
          {lockedReason}
        </p>
      )}
    </div>
  );
}
