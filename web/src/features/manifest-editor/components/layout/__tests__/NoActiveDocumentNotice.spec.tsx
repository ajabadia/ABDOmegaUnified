/**
 * @jest-environment jsdom
 *
 * Tests de la franja de "no hay documento activo".
 *
 * El componente es tonto a propósito. Lo que importa es que exista, que sea
 * `role="alert"` (aquí SÍ hay anomalía, al contrario que en el aviso de
 * historial) y que diga que lo que se está editando no está unido a nada:
 * un editor vacío sin esa frase parece un cuelgue.
 */
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import NoActiveDocumentNotice from '../NoActiveDocumentNotice';

describe('NoActiveDocumentNotice', () => {
  it('se renderiza con role=alert', () => {
    render(<NoActiveDocumentNotice />);
    const banner = screen.getByTestId('no-active-document-notice');
    expect(banner.getAttribute('role')).toBe('alert');
  });

  it('usa alert y no status, a diferencia del aviso de historial', () => {
    // Una anomalía que el usuario debe ver YA se interrumpe. El aviso de
    // historial es `status` porque no hay nada que urge.
    render(<NoActiveDocumentNotice />);
    const banner = screen.getByTestId('no-active-document-notice');
    expect(banner.hasAttribute('aria-live')).toBe(false);
  });

  it('dice que no hay documento abierto', () => {
    render(<NoActiveDocumentNotice />);
    expect(screen.getByTestId('no-active-document-notice').textContent).toContain('No active document');
  });

  it('advierte de que lo que se edite no está unido a un fichero', () => {
    // La consecuencia práctica: sin esto el usuario podría escribir media hora
    // y llevársela aluguarda.
    render(<NoActiveDocumentNotice />);
    const texto = screen.getByTestId('no-active-document-notice').textContent ?? '';
    expect(texto).toContain('not be attached to a file');
  });
});
