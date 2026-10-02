/**
 * @jest-environment jsdom
 *
 * Tests de la barra de pestañas de documento.
 *
 * El reducer ya garantiza que no se puede quedar sin documento activo; lo que
 * se prueba aquí es la mitad que el usuario perceive: que el botón de cierre
 * EXISTA, que al pulsarlo pase algo visible, y que el aviso diga la verdad
 * sobre por qué el cierre no ocurrió.
 *
 * El componente recibe el orquestador ya construido (no lo crea), así que los
 * tests le pasan un doble que registra las llamadas. Eso permite comprobar
 * que el rechazo lo decide la BARRA y no el doble, sin depender del reducer.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DocumentTabBar from '../DocumentTabBar';
import type { DocumentOrchestrator, DocumentState } from '../../../types/document';

const DEFAULT_MANIFEST = { id: 'm', metadata: { name: '' } } as unknown as DocumentState['manifest'];

function makeDoc(id: string, name: string, isDirty = false): DocumentState {
  return {
    id,
    manifest: { ...DEFAULT_MANIFEST, metadata: { name } } as DocumentState['manifest'],
    isDirty,
    lastStableHash: '',
    history: { past: [], future: [], lastSavedIndex: -1 },
    isInitializing: false,
    contract: null,
    wasmBuffer: null,
    extraResources: []
  };
}

function makeOrchestrator(overrides: {
  docs: Record<string, DocumentState>;
  active: string;
}): {
  orchestrator: DocumentOrchestrator;
  closeDocument: ReturnType<typeof jest.fn>;
  setActiveDocument: ReturnType<typeof jest.fn>;
} {
  const closeDocument = jest.fn();
  const setActiveDocument = jest.fn();
  const orchestrator = {
    documentsById: overrides.docs,
    activeDocumentId: overrides.active,
    closeDocument,
    setActiveDocument
  } as unknown as DocumentOrchestrator;
  return { orchestrator, closeDocument, setActiveDocument };
}

const single = () => makeOrchestrator({ docs: { primary: makeDoc('primary', 'VcoTwo') }, active: 'primary' });
const pair = () =>
  makeOrchestrator({
    docs: { primary: makeDoc('primary', 'VcoTwo'), second: makeDoc('second', 'FilterBank', true) },
    active: 'primary'
  });

describe('DocumentTabBar', () => {
  it('lista los documentos abiertos', () => {
    render(<DocumentTabBar orchestrator={pair().orchestrator} />);
    const tabs = screen.getAllByTestId('document-tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].textContent).toContain('VcoTwo');
    expect(tabs[1].textContent).toContain('FilterBank');
  });

  it('marca el documento activo y solo ese', () => {
    render(<DocumentTabBar orchestrator={pair().orchestrator} />);
    const tabs = screen.getAllByTestId('document-tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('el botón de cierre nombra el documento que cierra', () => {
    // Un aria-label genérico ("Close") con dos pestañas idénticas es
    // inaccesible: un lector de pantalla no dice cuál se está cerrando.
    render(<DocumentTabBar orchestrator={pair().orchestrator} />);
    expect(screen.getByLabelText('Close VcoTwo')).toBeDefined();
    expect(screen.getByLabelText('Close FilterBank')).toBeDefined();
  });

  it('marca los documentos con cambios sin guardar', () => {
    render(<DocumentTabBar orchestrator={pair().orchestrator} />);
    const dots = screen.getAllByTestId('document-dirty-dot');
    expect(dots).toHaveLength(1);
  });

  it('cerrar con varios documentos abiertos SÍ cierra', () => {
    const { orchestrator, closeDocument } = pair();
    render(<DocumentTabBar orchestrator={orchestrator} />);
    fireEvent.click(screen.getByLabelText('Close FilterBank'));
    expect(closeDocument).toHaveBeenCalledWith('second');
    expect(screen.queryByTestId('last-document-refusal')).toBeNull();
  });

  it('cerrar el ÚLTIMO documento no lo cierra y lo explica', () => {
    const { orchestrator, closeDocument } = single();
    render(<DocumentTabBar orchestrator={orchestrator} />);

    expect(screen.queryByTestId('last-document-refusal')).toBeNull();
    fireEvent.click(screen.getByLabelText('Close VcoTwo'));

    // Lo importante: el documento sigue ahí. El no-op del reducer ya lo
    // garantiza, pero la barra tampoco debe pedir un cierre imposible.
    expect(closeDocument).not.toHaveBeenCalled();
    const aviso = screen.getByTestId('last-document-refusal');
    expect(aviso.textContent).toContain('VcoTwo');
    expect(aviso.textContent).toContain('last open document');
  });

  it('el botón de cierre del último documento NO está deshabilitado', () => {
    // Si estuviera `disabled`, el usuario pulsaría y no ocurriría nada: el
    // mismo fallo que arregla este componente, otra vez.
    const { orchestrator } = single();
    render(<DocumentTabBar orchestrator={orchestrator} />);
    const close = screen.getByLabelText('Close VcoTwo');
    expect(close.hasAttribute('disabled')).toBe(false);
    expect(close.getAttribute('aria-disabled')).toBeNull();
  });

  it('el aviso se anuncia con role=status, sin interrumpir al lector', () => {
    const { orchestrator } = single();
    render(<DocumentTabBar orchestrator={orchestrator} />);
    fireEvent.click(screen.getByLabelText('Close VcoTwo'));
    const aviso = screen.getByTestId('last-document-refusal');
    expect(aviso.getAttribute('role')).toBe('status');
    expect(aviso.getAttribute('aria-live')).toBe('polite');
  });

  it('el aviso se puede quitar a mano', () => {
    const { orchestrator } = single();
    render(<DocumentTabBar orchestrator={orchestrator} />);
    fireEvent.click(screen.getByLabelText('Close VcoTwo'));
    fireEvent.click(screen.getByLabelText('Dismiss explanation'));
    expect(screen.queryByTestId('last-document-refusal')).toBeNull();
  });

  it('el aviso NO se autodescarta con el tiempo', () => {
    // Los toasts de la app duran 4 segundos. Si este se fuera con ellos, un
    // usuario que vuelve a intentarlo dos minutos después se encontraría el
    // mismo botón mudo sin explicación, que es justo lo que se arregla aquí.
    jest.useFakeTimers();
    try {
      const { orchestrator } = single();
      render(<DocumentTabBar orchestrator={orchestrator} />);
      fireEvent.click(screen.getByLabelText('Close VcoTwo'));
      expect(screen.getByTestId('last-document-refusal')).toBeDefined();

      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      expect(screen.getByTestId('last-document-refusal')).toBeDefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('el aviso se retira solo cuando aparece un segundo documento', () => {
    // La regla que explicaba deja de aplicar; dejarlo puesto sería mentir.
    const base = single();
    const { rerender } = render(<DocumentTabBar orchestrator={base.orchestrator} />);
    fireEvent.click(screen.getByLabelText('Close VcoTwo'));
    expect(screen.getByTestId('last-document-refusal')).toBeDefined();

    const withTwo = pair();
    rerender(<DocumentTabBar orchestrator={withTwo.orchestrator} />);
    expect(screen.queryByTestId('last-document-refusal')).toBeNull();
  });

  it('cerrar una pestaña inactiva no la activa antes de cerrarla', () => {
    // El botón vive DENTRO de la pestaña. Sin stopPropagation el clic
    // burbujea al onClick de la pestaña, la selecciona y luego la cierra:
    // `FilterBank` se cerraría siendo el documento activo. Por eso lo que se
    // comprueba es que setActiveDocument NO se llama, no que el cierre ocurra.
    const { orchestrator, closeDocument, setActiveDocument } = pair();
    render(<DocumentTabBar orchestrator={orchestrator} />);
    fireEvent.click(screen.getByLabelText('Close FilterBank'));
    expect(closeDocument).toHaveBeenCalledWith('second');
    expect(setActiveDocument).not.toHaveBeenCalled();
  });

  it('pulsar la pestaña (no el botón) sí la activa', () => {
    const { orchestrator, setActiveDocument } = pair();
    render(<DocumentTabBar orchestrator={orchestrator} />);
    fireEvent.click(screen.getAllByTestId('document-tab')[1]);
    expect(setActiveDocument).toHaveBeenCalledWith('second');
  });

  it('usar el id como etiqueta cuando el manifiesto no tiene nombre', () => {
    const { orchestrator } = makeOrchestrator({
      docs: { sin_nombre: makeDoc('sin_nombre', '') },
      active: 'sin_nombre'
    });
    render(<DocumentTabBar orchestrator={orchestrator} />);
    expect(screen.getByTestId('document-tab').textContent).toContain('sin_nombre');
  });
});

/**
 * El botón "Nuevo" es lo que hace alcanzable el multi-documento: sin él,
 * `openDocument` no tenía ningún llamador en producción y la app se quedaba
 * con un único documento para siempre.
 */
describe('DocumentTabBar — new document', () => {
  it('no renderiza el botón si no se le pasa la acción', () => {
    const { orchestrator } = single();
    render(<DocumentTabBar orchestrator={orchestrator} />);
    expect(screen.queryByTestId('document-tab-new')).toBeNull();
  });

  it('invoca onNewDocument al pulsarlo', () => {
    const { orchestrator } = single();
    const onNewDocument = jest.fn();
    render(<DocumentTabBar orchestrator={orchestrator} onNewDocument={onNewDocument} />);

    fireEvent.click(screen.getByTestId('document-tab-new'));

    expect(onNewDocument).toHaveBeenCalledTimes(1);
  });

  it('funciona también con varios documentos abiertos', () => {
    const { orchestrator } = pair();
    const onNewDocument = jest.fn();
    render(<DocumentTabBar orchestrator={orchestrator} onNewDocument={onNewDocument} />);

    fireEvent.click(screen.getByTestId('document-tab-new'));

    expect(onNewDocument).toHaveBeenCalledTimes(1);
  });

  it('no lo confunde con una pestaña a la hora de anunciarlo', () => {
    // No es una pestaña: si un lector de pantalla lo anunciara como "pestaña
    // 2 de 2", el usuario oiría un número que no corresponde con nada navegable.
    const { orchestrator } = single();
    render(<DocumentTabBar orchestrator={orchestrator} onNewDocument={jest.fn()} />);

    const button = screen.getByTestId('document-tab-new');
    expect(button.getAttribute('role')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('New document');
    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(1);
  });
});
