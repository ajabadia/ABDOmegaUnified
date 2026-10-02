/**
 * @jest-environment jsdom
 *
 * Tests del banner de historial descartado.
 *
 * El componente es tonto a propósito: toda la decisión está en
 * `detectUndoHistoryLoss`. Lo que se prueba aquí es lo que el usuario
 * perceives: que el aviso exista, que diga la causa correcta, que se pueda
 * quitar y que no robe el foco ni interrumpa al lector de pantalla.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SessionRestoreNotice from '../SessionRestoreNotice';
import {
  publishSessionRestoreNotice,
  resetSessionRestoreNoticeStore,
  publishSessionRecoveryNotice,
  resetSessionRecoveryNoticeStore
} from '@/features/manifest-editor/hooks/useSessionRestoreNotice';

beforeEach(() => {
  act(() => {
    resetSessionRestoreNoticeStore();
    resetSessionRecoveryNoticeStore();
  });
});

const notice = (overrides = {}) => ({
  documentId: 'primary',
  documentName: 'VcoTwo',
  lostSteps: 4,
  reason: 'vault-missing' as const,
  ...overrides
});

describe('SessionRestoreNotice', () => {
  it('no renderiza nada si no hay aviso', () => {
    const { container } = render(<SessionRestoreNotice />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra el documento y el número de pasos perdidos', () => {
    act(() => {
      publishSessionRestoreNotice(notice());
    });
    render(<SessionRestoreNotice />);

    const banner = screen.getByTestId('session-restore-notice');
    expect(banner.textContent).toContain('VcoTwo');
    expect(banner.textContent).toContain('4 undo steps');
  });

  it('expone la causa en un data-attribute para pruebas y diagnóstico', () => {
    act(() => {
      publishSessionRestoreNotice(notice({ reason: 'vault-stale' }));
    });
    render(<SessionRestoreNotice />);
    expect(screen.getByTestId('session-restore-notice').getAttribute('data-reason')).toBe('vault-stale');
  });

  it('cambia el texto según la causa', () => {
    act(() => {
      publishSessionRestoreNotice(notice({ reason: 'vault-unavailable' }));
    });
    const { unmount } = render(<SessionRestoreNotice />);
    expect(screen.getByText('Undo history unavailable')).toBeTruthy();
    unmount();

    act(() => {
      resetSessionRestoreNoticeStore();
      publishSessionRestoreNotice(notice({ reason: 'vault-stale' }));
    });
    render(<SessionRestoreNotice />);
    expect(screen.getByText('Undo history discarded')).toBeTruthy();
    expect(screen.getByTestId('session-restore-notice').textContent).toContain('earlier version');
  });

  it('se descarta al pulsar la X y no vuelve solo', () => {
    act(() => {
      publishSessionRestoreNotice(notice());
    });
    render(<SessionRestoreNotice />);

    fireEvent.click(screen.getByLabelText('Dismiss undo history notice'));

    // El store es la fuente de verdad: si el banner desaparece es porque el
    // estado se limpió, no porque el componente se escondiera.
    expect(screen.queryByTestId('session-restore-notice')).toBeNull();
  });

  it('reaparece si se publica otro aviso después', () => {
    act(() => {
      publishSessionRestoreNotice(notice());
    });
    const { rerender } = render(<SessionRestoreNotice />);
    act(() => {
      publishSessionRestoreNotice(notice({ documentId: 'otro' }));
    });
    rerender(<SessionRestoreNotice />);
    expect(screen.getByTestId('session-restore-notice')).toBeTruthy();
  });

  it('es una región de estado educada, no una alerta interruptiva', () => {
    // `alert` interrumpe lo que un lector de pantalla esté leyendo, y esto
    // no es una emergencia: los cambios están intactos.
    act(() => {
      publishSessionRestoreNotice(notice());
    });
    render(<SessionRestoreNotice />);

    const banner = screen.getByRole('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('no publica dos veces el mismo aviso', () => {
    let renders = 0;
    function Probe() {
      renders += 1;
      return <SessionRestoreNotice />;
    }
    act(() => {
      publishSessionRestoreNotice(notice());
    });
    render(<Probe />);
    const before = renders;

    act(() => {
      publishSessionRestoreNotice(notice());
    });

    // La hidratación puede reejecutarse (StrictMode, remontaje) y no debe
    // provocar un render extra por un aviso idéntico.
    expect(renders).toBe(before);
  });
});


describe('SessionRestoreNotice — sesión resucitada', () => {
  const recuperado = (overrides: Record<string, unknown> = {}) => ({
    recoveredIds: ['vco'],
    unrecoverableIds: [] as string[],
    documentNames: ['VcoTwo'],
    ...overrides
  });

  it('no dice nada si no hubo resurrección', () => {
    render(<SessionRestoreNotice />);
    expect(screen.queryByTestId('session-recovery-notice')).toBeNull();
  });

  it('anuncia que la sesión se recuperó, con el nombre del documento', () => {
    act(() => {
      publishSessionRecoveryNotice(recuperado());
    });
    render(<SessionRestoreNotice />);
    const banner = screen.getByTestId('session-recovery-notice');
    expect(banner.textContent).toContain('Previous session recovered');
    expect(banner.textContent).toContain('VcoTwo');
  });

  it('es role=alert: perder una sesión no es un aviso tranquilo', () => {
    act(() => {
      publishSessionRecoveryNotice(recuperado());
    });
    render(<SessionRestoreNotice />);
    expect(screen.getByTestId('session-recovery-notice').getAttribute('role')).toBe('alert');
  });

  it('expone el recuento por atributos, para poder consultarlo', () => {
    act(() => {
      publishSessionRecoveryNotice(recuperado({ recoveredIds: ['a', 'b'], documentNames: ['A', 'B'], unrecoverableIds: ['c'] }));
    });
    render(<SessionRestoreNotice />);
    const banner = screen.getByTestId('session-recovery-notice');
    expect(banner.getAttribute('data-recovered')).toBe('2');
    expect(banner.getAttribute('data-unrecoverable')).toBe('1');
  });

  it('si no se recuperó NADA, lo dice y avisa de que es un módulo en blanco', () => {
    // El peor caso: el usuario podría creerse que está editando lo suyo.
    act(() => {
      publishSessionRecoveryNotice(recuperado({ recoveredIds: [], documentNames: [] }));
    });
    render(<SessionRestoreNotice />);
    const texto = screen.getByTestId('session-recovery-notice').textContent ?? '';
    expect(texto).toContain('could not be recovered');
    expect(texto).toContain('blank module');
    expect(texto).toContain('unsaved work');
  });

  it('NUNCA dice "recuperada" si no recuperó nada', () => {
    act(() => {
      publishSessionRecoveryNotice(recuperado({ recoveredIds: [], documentNames: [] }));
    });
    render(<SessionRestoreNotice />);
    const texto = screen.getByTestId('session-recovery-notice').textContent ?? '';
    expect(texto).not.toContain('session recovered');
  });

  it('menciona lo que NO se pudo recuperar, en singular y en plural', () => {
    // Decir "se recuperó" sin decir qué se dejó atrás es media verdad, y la
    // media verdad aquí es la que hace que alguien pierda trabajo.
    act(() => {
      publishSessionRecoveryNotice(
        recuperado({ recoveredIds: ['a'], documentNames: ['A'], unrecoverableIds: ['x'] })
      );
    });
    render(<SessionRestoreNotice />);
    let texto = screen.getByTestId('session-recovery-notice').textContent ?? '';
    expect(texto).toContain('One more document');
    expect(texto).toContain('unrecoverable');

    act(() => {
      publishSessionRecoveryNotice(
        recuperado({ recoveredIds: ['a', 'b'], documentNames: ['A', 'B'], unrecoverableIds: ['x', 'y'] })
      );
    });
    texto = screen.getByTestId('session-recovery-notice').textContent ?? '';
    expect(texto).toContain('2 more documents');
    expect(texto).toContain('were stored');
  });

  it('no se puede descartar: ocurrió antes de que existiera el editor', () => {
    act(() => {
      publishSessionRecoveryNotice(recuperado());
    });
    render(<SessionRestoreNotice />);
    expect(screen.queryByLabelText('Dismiss undo history notice')).toBeNull();
  });

  it('toma precedencia sobre el aviso de deshacer', () => {
    act(() => {
      publishSessionRestoreNotice(notice());
      publishSessionRecoveryNotice(recuperado());
    });
    render(<SessionRestoreNotice />);
    expect(screen.getByTestId('session-recovery-notice')).toBeDefined();
    expect(screen.queryByTestId('session-restore-notice')).toBeNull();
  });
});
