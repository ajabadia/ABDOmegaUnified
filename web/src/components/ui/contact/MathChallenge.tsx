/**
 * @purpose Renderiza un componente desafío matemático que muestra una ecuación y permite al usuario ingresar su respuesta para su verificación.
 * @purpose_en Renders a mathematical challenge component that displays an equation and allows the user to input their answer for verification.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:cpcvu7
 * @lastUpdated 2026-06-16T17:35:54.022Z
 */

import { Loader2 } from "lucide-react";

interface MathChallengeProps {
  challenge: { a: number; b: number } | null;
  label: string;
}

export function MathChallenge({ challenge, label }: MathChallengeProps) {
  return (
    <div className="space-y-4">
      <label htmlFor="challenge" className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <div className="flex-[2] bg-zinc-900/80 border border-primary/30 h-[64px] flex items-center justify-center font-headline text-3xl italic font-black text-primary px-6 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
          {challenge ? `${challenge.a} + ${challenge.b}` : (
            <Loader2 className="animate-spin text-zinc-700" size={24} />
          )}
        </div>
        <div className="flex-1">
          <input
            required
            aria-required="true"
            id="challenge"
            name="challenge"
            type="number"
            placeholder="?"
            className="w-full bg-zinc-900/50 border border-white/10 rounded-none h-[64px] text-center text-2xl text-white font-headline font-bold focus:outline-none focus:border-primary transition-all placeholder:text-zinc-800"
            aria-label={label}
          />
        </div>
      </div>
    </div>
  );
}
