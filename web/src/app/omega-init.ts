/**
 * @purpose Side-effect init module: arranca el contenedor DI al importarse
 * @purpose_en Side-effect init module: boots the DI container on import
 * @refactorable false
 * @classification Infrastructure
 * @complexity Trivial
 * @fingerprint exports:0,imports:2,sig:new
 * @lastUpdated 2026-06-22
 */

import { initializeServiceContainer } from '@/services/serviceInit';

if (typeof window !== 'undefined') {
  initializeServiceContainer();
}
