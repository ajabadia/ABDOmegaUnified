/**
 * @purpose Renderiza un componente de campo de contacto que puede ser tanto un input como una textarea según las propiedades.
 * @purpose_en Renders a contact field component that can be either an input or a textarea based on props.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1q9d3jw
 * @lastUpdated 2026-06-16T17:35:42.848Z
 */

import { cn } from "@/lib/utils";

interface ContactFieldProps {
  id: string;
  label: string;
  name: string;
  type?: "text" | "email" | "number";
  placeholder?: string;
  required?: boolean;
  rows?: number;
  isTextArea?: boolean;
  className?: string;
}

export function ContactField({ 
  id, 
  label, 
  name, 
  type = "text", 
  placeholder, 
  required = true, 
  rows = 4, 
  isTextArea = false,
  className
}: ContactFieldProps) {
  const inputClasses = "w-full bg-zinc-900/50 border border-white/5 rounded-none px-6 py-4 text-white font-body focus:outline-none focus:border-primary/50 transition-colors placeholder:text-zinc-800";

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">
        {label}
      </label>
      {isTextArea ? (
        <textarea
          required={required}
          aria-required={required}
          id={id}
          name={name}
          rows={rows}
          placeholder={placeholder}
          className={cn(inputClasses, "resize-none")}
          aria-label={label}
        />
      ) : (
        <input
          required={required}
          aria-required={required}
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          className={inputClasses}
          aria-label={label}
        />
      )}
    </div>
  );
}
