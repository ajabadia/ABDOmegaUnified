'use client';

/**
 * @purpose Inicializa el onboarding si es la primera vez que se abre el editor.
 * @purpose_en Initializes onboarding if it's the first time opening the editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:new
 * @lastUpdated 2026-06-22
 */

import { useEffect } from 'react';
import { isTourCompleted } from '../components/shared/OnboardingWalkthrough';

export function useWorkbenchOnboarding(
  isOnboardingOpen: boolean,
  toggleUIState: (key: string) => void,
): void {
  useEffect(() => {
    if (!isTourCompleted() && !isOnboardingOpen) {
      toggleUIState('isOnboardingOpen');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
