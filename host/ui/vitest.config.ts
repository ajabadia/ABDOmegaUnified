import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['tests/**/*.test.ts'],
    // Detecta timers/handles abiertos al terminar cada test (p.ej. el
    // setInterval 2s del health-monitor de OmegaRPC) — falla/avisa si un
    // afterAll no limpia. Los tests que tocan el bundle/OmegaRPC limpian
    // healthTimer explícitamente (bundle-arity, GlobalFxStrip.*, rpc_contract).
    detectOpenHandles: true,
  },
});
