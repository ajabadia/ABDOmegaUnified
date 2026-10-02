/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useWatchdog } from '../useWatchdog';

/**
 * POR QUÉ ESTE TEST EXISTE
 *
 * El watchdog reintentaba contra `127.0.0.1:3001` cada 3 segundos PARA SIEMPRE.
 * Como el watchdog es un script aparte (`omega-watchdog.mjs`), el caso por
 * defecto es que no esté levantado, así que el editor emitía un warning y un
 * `ERR_CONNECTION_REFUSED` cada 3 segundos, indefinidamente. Con HMR el efecto
 * se remontaba y el ciclo se multiplicaba.
 *
 * La app no se rompía — el watchdog es una comodidad de desarrollo, no una
 * dependencia — pero ese goteo constante era el motivo de que un warning de
 * verdad pasara desapercibido: cuando todo grita, nada se lee.
 *
 * Estos asserts fijan las tres propiedades que hacen falta: que el backoff
 * CRECE, que hay un TOPE, y que el número de avisos está ACOTADO. Un test que
 * solo comprobara "reintenta" pasaría con el código viejo, que era el problema.
 */

/** EventSource falso: registra instancias y permite dispararlas a mano. */
class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  /** Simula que el servicio está levantado. */
  open() {
    this.onopen?.();
  }

  /** Simula que el servicio no está levantado (el caso por defecto). */
  fail() {
    this.onerror?.();
  }

  /** Último EventSource creado. */
  static get latest(): MockEventSource {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
}

/** Avanza el reloj de Jest y deja correr los timers pendientes. */
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useWatchdog', () => {
  let warn: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.useFakeTimers();
    MockEventSource.instances = [];
    (globalThis as unknown as { EventSource: unknown }).EventSource = MockEventSource;
    // jsdom sirve siempre localhost, que es justo cuando el watchdog conecta.
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete (globalThis as unknown as { EventSource?: unknown }).EventSource;
  });

  it('connects to the local watchdog endpoint', () => {
    renderHook(() => useWatchdog(() => {}));
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.latest.url).toBe('http://127.0.0.1:3001/events');
  });

  it('reports connected when the service answers', () => {
    const { result } = renderHook(() => useWatchdog(() => {}));

    act(() => MockEventSource.latest.open());

    expect(result.current.status).toBe('connected');
  });

  it('forwards a manifest update to the callback', () => {
    const onUpdate = jest.fn<(content: string) => void>();
    renderHook(() => useWatchdog(onUpdate));

    act(() => {
      MockEventSource.latest.open();
      MockEventSource.latest.onmessage?.({
        data: JSON.stringify({ filename: 'patch.acemm', content: '{"id":"x"}', timestamp: 'now' }),
      });
    });

    expect(onUpdate).toHaveBeenCalledWith('{"id":"x"}');
  });

  it('backs off progressively instead of retrying every 3s', async () => {
    renderHook(() => useWatchdog(() => {}));

    // Primer fallo → reintento a los 3s.
    act(() => MockEventSource.latest.fail());
    expect(MockEventSource.instances).toHaveLength(1);

    await advance(2999);
    expect(MockEventSource.instances).toHaveLength(1); // todavía no toca
    await advance(1);
    expect(MockEventSource.instances).toHaveLength(2); // ahora sí

    // Segundo fallo → el siguiente reintento debe esperar MÁS que 3s.
    act(() => MockEventSource.latest.fail());
    await advance(3000);
    expect(MockEventSource.instances).toHaveLength(2); // 3s ya no basta
    await advance(3000);
    expect(MockEventSource.instances).toHaveLength(3); // 6s sí
  });

  it('stops retrying after the cap and reports unavailable', async () => {
    const { result } = renderHook(() => useWatchdog(() => {}));

    // Ocho fallos: el último agota el presupuesto de reintentos.
    for (let i = 0; i < 8; i++) {
      act(() => MockEventSource.latest.fail());
      await advance(120000);
    }

    expect(result.current.status).toBe('unavailable');

    const countAfterGivingUp = MockEventSource.instances.length;
    await advance(600000);
    // Y sigue parado: el tope es un tope, no un intervalo largo.
    expect(MockEventSource.instances).toHaveLength(countAfterGivingUp);
  });

  it('emits a bounded number of warnings', async () => {
    renderHook(() => useWatchdog(() => {}));

    for (let i = 0; i < 8; i++) {
      act(() => MockEventSource.latest.fail());
      await advance(120000);
    }
    await advance(600000);

    // El comportamiento anterior emitía un warn cada 3s para siempre; aquí
    // hay como mucho uno por escalón más el resumen final.
    expect(warn.mock.calls.length).toBeLessThanOrEqual(9);
    expect(warn.mock.calls.length).toBeGreaterThan(0);
  });

  it('resets the retry budget after a successful connection', async () => {
    const { result } = renderHook(() => useWatchdog(() => {}));

    // Agota casi todo el presupuesto.
    for (let i = 0; i < 7; i++) {
      act(() => MockEventSource.latest.fail());
      await advance(120000);
    }

    // El watchdog arranca tarde. Se conecta.
    act(() => MockEventSource.latest.open());
    expect(result.current.status).toBe('connected');

    // Y vuelve a caerse: debe reintentar con normalidad, no estar ya agotado.
    act(() => MockEventSource.latest.fail());
    expect(result.current.status).toBe('error');
    await advance(3000);
    expect(MockEventSource.instances.length).toBeGreaterThan(8);
  });

  it('cleans up the pending timer on unmount', async () => {
    const { unmount } = renderHook(() => useWatchdog(() => {}));

    act(() => MockEventSource.latest.fail());
    const before = MockEventSource.instances.length;

    unmount();
    await advance(600000);

    expect(MockEventSource.instances).toHaveLength(before);
    expect(MockEventSource.latest.closed).toBe(true);
  });
});
