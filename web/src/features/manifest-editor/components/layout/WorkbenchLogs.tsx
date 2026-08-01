'use client';

/**
 * @purpose Renderiza un terminal flotante con animaciones industriales — usa useWorkbenchLogs hook para estado local.
 * @purpose_en Renders a floating log terminal with industrial animations — uses useWorkbenchLogs hook for local state.
 * @refactorable false (refactored — useWorkbenchLogs hook extraído)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:new
 * @lastUpdated 2026-06-20
 */

import { useWorkbenchLogs } from '@/features/manifest-editor/hooks/layout/useWorkbenchLogs';

interface WorkbenchLogsProps {
  logs?: string[];
}

/**
 * WorkbenchLogs (v7.2.3)
 * Floating log terminal with industrial animations.
 * Show/hide state is managed locally via useWorkbenchLogs.
 */
export default function WorkbenchLogs({ logs }: WorkbenchLogsProps) {
  const { LogTerminalPanel } = useWorkbenchLogs({ logs });
  return LogTerminalPanel;
}
