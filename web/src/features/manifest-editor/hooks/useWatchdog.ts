'use client';

/**
 * @purpose Gestiona actualizaciones en tiempo real a archivos manifest en entornos de desarrollo locales utilizando un servicio de monitoreo.
 * @purpose_en Manages real-time updates to manifest files using a watchdog service in local development environments.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:p9mw16
 * @lastUpdated 2026-06-15T15:15:27.118Z
 */

import { useEffect, useState, useRef } from 'react';

interface WatchdogMessage {
  filename: string;
  content: string;
  timestamp: string;
}

export const useWatchdog = (onUpdate: (content: string) => void) => {
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');
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

    const connect = () => {
      try {
        if (eventSource) eventSource.close();
        
        // Use 127.0.0.1 to bypass potential IPv6/DNS resolution issues on Windows
        eventSource = new EventSource('http://127.0.0.1:3001/events');

        eventSource.onopen = () => {
          console.log('[OMEGA WATCHDOG] Industrial Sync Established (127.0.0.1:3001)');
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
          setStatus('error');
          if (eventSource) eventSource.close();
          
          // Log only if not intentionally closed
          console.warn('[OMEGA WATCHDOG] Connection lost. Attempting industrial recovery in 3s...');
          retryTimer = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.warn('[OMEGA WATCHDOG] Connection failed to initialize:', err);
        setStatus('error');
      }
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return { status, lastUpdate };
};
