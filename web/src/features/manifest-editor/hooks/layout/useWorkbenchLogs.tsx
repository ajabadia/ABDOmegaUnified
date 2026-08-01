'use client';

/**
 * @purpose Hook que gestiona el estado local de showLogs y renderiza el terminal de logs flotante.
 * @purpose_en Hook that manages local showLogs state and renders the floating log terminal.
 * @classification Hook
 * @complexity Low
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogTerminal from '../../components/logs/LogTerminal';

export interface UseWorkbenchLogsOptions {
  /** Logs externos (ej: editor.logs). Opcional — si no se provee, usa logs internos. */
  logs?: string[] | undefined;
}

export interface UseWorkbenchLogsReturn {
  /** Estado actual del terminal */
  showLogs: boolean;
  /** Forzar apertura/cierre */
  setShowLogs: (show: boolean) => void;
  /** Alternar visibilidad */
  toggleLogs: () => void;
  /** Logs a mostrar */
  logs: string[];
  /** Agregar un log */
  addLog: (log: string) => void;
  /** Limpiar logs */
  clearLogs: () => void;
  /** Componente JSX del terminal flotante (renderizar en el layout) */
  LogTerminalPanel: React.ReactNode;
}

/**
 * Hook que maneja el estado del terminal de logs y expone
 * el JSX del panel flotante con animaciones industriales.
 *
 * Uso:
 *   const { showLogs, toggleLogs, LogTerminalPanel } = useWorkbenchLogs({ logs: editor.logs });
 *
 *   return (
 *     <div>
 *       {LogTerminalPanel}
 *     </div>
 *   );
 */
export function useWorkbenchLogs({
  logs: externalLogs,
}: UseWorkbenchLogsOptions = {}): UseWorkbenchLogsReturn {
  const [showLogs, setShowLogs] = useState(false);
  const [internalLogs, setInternalLogs] = useState<string[]>([]);

  const toggleLogs = useCallback(() => setShowLogs((prev) => !prev), []);

  const addLog = useCallback((log: string) => {
    setInternalLogs((prev) => [...prev, log]);
  }, []);

  const clearLogs = useCallback(() => {
    setInternalLogs([]);
  }, []);

  const logs = externalLogs ?? internalLogs;

  const LogTerminalPanel = (
    <AnimatePresence>
      {showLogs && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 h-80 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
        >
          <div className="h-full border-t border-accent/30">
            <LogTerminal logs={logs} />
            <button
              onClick={() => setShowLogs(false)}
              className="absolute top-2 right-4 p-1 text-foreground/20 hover:text-foreground/60 transition-colors"
              title="Close Log Terminal"
            >
              <span className="text-[9px] font-black uppercase tracking-widest">Close</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return {
    showLogs,
    setShowLogs,
    toggleLogs,
    logs,
    addLog,
    clearLogs,
    LogTerminalPanel,
  };
}
