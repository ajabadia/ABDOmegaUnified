'use client';

/**
 * @purpose Gestiona actualizaciones en tiempo real de archivos manifest en desarrollo local, con reintentos acotados y backoff exponencial.
 * @purpose_en Manages real-time updates to manifest files in local development, with bounded retries and exponential backoff.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @lastUpdated 2026-10-02T00:00:00.000Z
 */

import { useEffect, useState, useRef } from 'react';

interface WatchdogMessage {
  filename: string;
  content: string;
  timestamp: string;
}

/** Estado del watchdog. `unavailable` es un destino terminal, no un reintento. */
export type WatchdogStatus = 'idle' | 'connected' | 'error' | 'unavailable';

/**
 * POR QUÉ HAY UN TOPE DE REINTENTOS
 *
 * Antes, un `EventSource` fallido reintentaba cada 3 segundos PARA SIEMPRE. Sin
 * el servicio levantado en `127.0.0.1:3001` —que es el caso por defecto, porque
 * el watchdog es un script aparte (`omega-watchdog.mjs`)— eso significaba un
 * `console.warn` más un `ERR_CONNECTION_REFUSED` cada 3 segundos, indefinidamente.
 *
 * Medido antes de este cambio: ~40 mensajes en pocos minutos, y con HMR el
 * efecto se vuelve a montar, así que se multiplicaba. La app no se rompía (el
 * watchdog es una comodidad de desarrollo, no una dependencia), pero enterraba
 * los errores de verdad: un warning que se repite cada 3s deja de leerse.
 *
 * Ahora el backoff crece (3s, 6s, 12s, 24s, tope de 60s) y tras MAX_RETRIES el
 * hook se detiene en `unavailable`. Se avisa UNA vez por escalón, no una por
 * intento, para que el log siga siendo legible.
 *
 * El contador se reinicia cuando la conexión se establece: si el watchdog
 * arranca tarde, el hook no debe quedarse muerto por haber fallado antes.
 */
const MAX_RETRIES = 8;
const BASE_DELAY_MS = 3000;
const MAX_DELAY_MS = 60000;

export const useWatchdog = (onUpdate: (content: string) => void) => {
  const [status, setStatus] = useState<WatchdogStatus>('idle');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    // Only attempt to connect to watchdog on local development to avoid mixed content errors on HTTPS deployments
    const isLocal = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (!isLocal) {
      console.log('[OMEGA WATCHDOG] Watchdog bypassed in remote production deployment.');
      return;
    }

    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let gaveUp = false;

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const connect = () => {
      if (gaveUp) return;
      try {
        if (eventSource) eventSource.close();

        // Use 127.0.0.1 to bypass potential IPv6/DNS resolution issues on Windows
        eventSource = new EventSource('http://127.0.0.1:3001/events');

        eventSource.onopen = () => {
          console.log('[OMEGA WATCHDOG] Industrial Sync Established (127.0.0.1:3001)');
          attempt = 0;
          setStatus('connected');
        };

        eventSource.onmessage = (event) => {
          if (event.data === ': ping') return;
          try {
            const data: WatchdogMessage = JSON.parse(event.data);
            console.log(`[OMEGA WATCHDOG] Atomic update detected: ${data.filename}`);
            onUpdateRef.current(data.content);
            setLastUpdate(new Date().toLocaleTimeString());
          } catch (err) {
            console.error('[OMEGA WATCHDOG] Telemetry parse error:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          clearRetry();

          attempt += 1;
          if (attempt >= MAX_RETRIES) {
            gaveUp = true;
            setStatus('unavailable');
            console.warn(
              `[OMEGA WATCHDOG] Service unreachable after ${MAX_RETRIES} attempts; ` +
              'giving up. Live .acemm reload is disabled — the editor works normally without it.'
            );
            return;
          }

          const delay = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
          // Un warn por escalón, no uno por intento: con 3s fijos eran 20 por
          // minuto y tapaban cualquier otro warning del editor.
          console.warn(
            `[OMEGA WATCHDOG] Connection lost. Retry ${attempt}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s.`
          );
          setStatus('error');
          retryTimer = setTimeout(connect, delay);
        };
      } catch (err) {
        // El `catch` anterior abandonaba en `error` sin reintentar nunca más.
        // Ahora pasa por el mismo circuito acotado que un fallo asíncrono: un
        // `EventSource` mal construido falla igual de irrecuperable que una
        // conexión rechazada, y tratar los dos casos distinto dejaba el hook
        // muerto sin avisar.
        console.warn('[OMEGA WATCHDOG] Connection failed to initialize:', err);
        setStatus('error');
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
          retryTimer = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      gaveUp = true;
      clearRetry();
      if (eventSource) eventSource.close();
    };
  }, []);

  return { status, lastUpdate };
};
