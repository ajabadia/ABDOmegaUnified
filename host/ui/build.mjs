import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'bundle.js',
  platform: 'browser',
  target: 'es2022',
  define: { 'window.OMEGA_BUILD_ID': '"DEV"' },
  logLevel: 'info',
});
console.log('OK bundle.js rebuilt with OMEGA_BUILD_ID="DEV"');
