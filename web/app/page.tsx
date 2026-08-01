/**
 * @purpose Redirige a los usuarios hacia la ruta '/en' cuando se accede a la página principal.
 * @purpose_en Redirects users to the '/en' route when accessing the main page.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1n50gik
 * @lastUpdated 2026-06-15T17:04:09.959Z
 */

import {redirect} from 'next/navigation';

export default function RootPage() {
  redirect('/en');
}
