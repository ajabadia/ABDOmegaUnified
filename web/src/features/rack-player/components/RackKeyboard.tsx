'use client';

import { useEffect, useMemo, useRef } from 'react';

/**
 * RackKeyboard — teclado virtual (2 octavas C3–C5) para tocar el rack WASM.
 *
 * Emite eventos MIDI al hilo principal (que los reenvía al worklet):
 *   NoteOn  → onMidi(0x90, note, 100)
 *   NoteOff → onMidi(0x80, note, 0)
 *
 * Se puede tocar con el ratón (clic sobre las teclas) o con el teclado físico:
 *   fila blanca:  a s d f g h j k
 *   fila negra:   w e t y u
 * (C3 → C4, note 48–60)
 */

const START_NOTE = 48; // C3
const END_NOTE = 72;   // C5

const isBlack = (n: number) => [1, 3, 6, 8, 10].includes(n % 12);

const KEYMAP: Record<string, number> = {
  a: 48, w: 49, s: 50, e: 51, d: 52, f: 53, t: 54,
  g: 55, y: 56, h: 57, u: 58, j: 59, k: 60,
};

interface RackKeyboardProps {
  onMidi: (status: number, d1: number, d2: number) => void;
  disabled?: boolean;
}

export default function RackKeyboard({ onMidi, disabled = false }: RackKeyboardProps) {
  const pressedRef = useRef<Set<number>>(new Set());

  const { whites, blacks, whiteW } = useMemo(() => {
    const whitesList: number[] = [];
    const blacksList: number[] = [];
    for (let n = START_NOTE; n <= END_NOTE; n++) {
      (isBlack(n) ? blacksList : whitesList).push(n);
    }
    return { whites: whitesList, blacks: blacksList, whiteW: 100 / whitesList.length };
  }, []);

  const noteOn = (note: number) => {
    if (disabled || pressedRef.current.has(note)) return;
    pressedRef.current.add(note);
    onMidi(0x90, note, 100);
  };

  const noteOff = (note: number) => {
    if (!pressedRef.current.has(note)) return;
    pressedRef.current.delete(note);
    onMidi(0x80, note, 0);
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const note = KEYMAP[e.key.toLowerCase()];
      if (note === undefined) return;
      e.preventDefault();
      if (e.repeat) return;
      noteOn(note);
    };
    const onUp = (e: KeyboardEvent) => {
      const note = KEYMAP[e.key.toLowerCase()];
      if (note === undefined) return;
      noteOff(note);
    };
    const onBlur = () => {
      for (const note of [...pressedRef.current]) noteOff(note);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return (
    <div
      className={`w-full relative rounded-lg overflow-hidden border border-[#202b46] bg-[#0b0f19] transition ${disabled ? 'opacity-50' : ''}`}
      style={{ height: 128 }}
    >
      {/* Teclas blancas */}
      <div className="flex h-full">
        {whites.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onMouseDown={() => noteOn(n)}
            onMouseUp={() => noteOff(n)}
            onMouseLeave={() => noteOff(n)}
            className="flex-1 h-full bg-gradient-to-b from-slate-100 to-slate-300 hover:from-cyan-50 border-r border-slate-400 focus:outline-none active:bg-cyan-200 transition-colors"
          />
        ))}
      </div>

      {/* Teclas negras (posicionadas sobre los blancos) */}
      {blacks.map((n) => {
        const idx = whites.filter((w) => w < n).length;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onMouseDown={() => noteOn(n)}
            onMouseUp={() => noteOff(n)}
            onMouseLeave={() => noteOff(n)}
            className="absolute top-0 h-3/5 bg-gradient-to-b from-slate-700 to-black hover:from-cyan-700 border border-black border-t-0 rounded-b focus:outline-none active:from-cyan-600 transition-colors"
            style={{
              left: `calc(${idx * whiteW}% - ${whiteW * 0.3}%)`,
              width: `${whiteW * 0.6}%`,
            }}
          />
        );
      })}

      <span className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500 pointer-events-none">
        C3–C5 · clic o teclado: A W S E D F T G Y H U J K
      </span>
    </div>
  );
}
