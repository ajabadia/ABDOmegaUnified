'use client';

import '@/app/omega-init';
import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { PreferencesProvider } from '@/features/manifest-editor/providers/PreferencesProvider';

const WorkbenchContainer = dynamic(
  () => import('@/features/manifest-editor/components/WorkbenchContainer'),
  { ssr: false }
);

export default function EditorPage() {
  const [isCellEditorOpen, setIsCellEditorOpen] = useState(false);

  return (
    <main id="main-editor-content" className="h-screen w-screen overflow-hidden bg-black">
      <Suspense fallback={<div className="h-full w-full bg-black flex items-center justify-center text-primary font-mono text-[10px] animate-pulse">INITIALIZING OMEGA EDITOR...</div>}>
        <PreferencesProvider>
          <WorkbenchContainer 
            onOpenCellEditor={() => setIsCellEditorOpen(true)}
            isCellEditorOpen={isCellEditorOpen}
            setIsCellEditorOpen={setIsCellEditorOpen}
          />
        </PreferencesProvider>
      </Suspense>
    </main>
  );
}
