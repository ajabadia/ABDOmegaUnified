'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Disable SSR for the interactive Rack Player to prevent audio worklet SSR issues
const RackPlayerContainer = dynamic(
  () => import('@/features/rack-player/components/RackPlayerContainer'),
  { ssr: false }
);

export default function PlayerPage() {
  return (
    <main id="main-player-content" className="h-screen w-screen overflow-hidden bg-black">
      <Suspense fallback={
        <div className="h-full w-full bg-[#0b0f19] flex items-center justify-center text-cyan-400 font-mono text-xs animate-pulse">
          LOADING ABDOMEGA SYNTHESIZER RACK...
        </div>
      }>
        <RackPlayerContainer />
      </Suspense>
    </main>
  );
}
