'use client';

/**
 * @purpose Gestiona el enfoque dentro de un contenedor modal atrapando las teclas Tab y Shift+Tab, auto-enfocando el primer elemento enfocado al activar.
 * @purpose_en Manages focus within a modal container by trapping Tab and Shift+Tab keys, auto-focusing the first focusable element on activation.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1w8wpp2
 * @lastUpdated 2026-06-15T20:49:43.180Z
 */

import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * useFocusTrap
 * 
 * Traps Tab/Shift+Tab focus within the container ref when isActive=true.
 * Auto-focuses the first focusable element on activation.
 * Returns a ref to attach to the container element.
 */
export function useFocusTrap(isActive: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  const getFocusableElements = useCallback(() => {
    if (!ref.current) return [];
    return Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }, []);

  // Auto-focus first focusable element when activated
  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => {
      const elements = getFocusableElements();
      if (elements.length > 0) {
        elements[0].focus();
      }
    }, 50); // Small delay to allow modal animation
    return () => clearTimeout(timer);
  }, [isActive, getFocusableElements]);

  // Trap Tab key
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;

      const elements = getFocusableElements();
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = elements[0];
      const lastEl = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, getFocusableElements]);

  return ref;
}
