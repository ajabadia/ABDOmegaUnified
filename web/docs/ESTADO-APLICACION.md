# Estado de la aplicación — 2 de octubre de 2026

Este documento está pensado para alguien que **no** programa. Explica qué funciona,
qué no, y qué hay que hacer. Nada de aquí requiere leer código para actuar.

---

## 1. Lo que arreglé

Todo lo de esta lista está **arreglado, probado y guardado en el historial de Git**.
Está **subido a GitHub**: son 15 commits en la rama `main`.

### Cosas que mentían y ahora dicen la verdad

| Qué | Antes | Ahora |
|---|---|---|
| Las rutas de la web | Con un tipo de letra mal escrito, casi ninguna página respondía. La web devolvía errores en sitios raros sin dar ninguna pista. | Funciona. Hay 608 casos generados automáticamente que lo comprueban. |
| Los módulos de sonido | Si un módulo no se encontraba, la aplicación decía "este módulo está mal formado". Mentía: el fichero sencillamente no estaba. | Dice el nombre del módulo y el fichero que falta. |
| Botón "Rehacer" | El rótulo decía `Ctrl+Shift+Z`. **Ese atajo no hacía nada.** El bueno es `Ctrl+Y`. | Dice la verdad. |
| Atajos en general | Los atajos se repartían en dos sitios distintos, y parte de la configuración era código que nunca se ejecutaba. | Un solo sitio. |
| Las carpetas que se publican | Cuatro carpetas necesarias eran **enlaces a carpetas de tu disco**, que solo existen en tu ordenador. En un servidor no existen. | Se reconstruyen solas al compilar, en cualquier ordenador. |

### El editor de texto: ya no necesita internet

Esto era lo más grave de los que he encontrado hoy, y lo descubrí porque por fin
ejecuté unas pruebas que nunca se habían ejecutado del todo.

El editor de código (la pestaña "Source") **no venía dentro de la aplicación**: la
descargaba de un servidor externo, `cdn.jsdelivr.net`, cada vez que se abría. Si ese
sitio estaba lento, bloqueado o no había conexión, la aplicación se quedaba
**colgada en "Loading..." para siempre y sin decir ningún error**. No es que estuviera
roto: sencillamente el editor no llegaba nunca.

**Ahora el editor viene de casa.** Se copia de los archivos que ya tenías al compilar y
se sirve desde tu propia aplicación. Medido en el navegador: el editor carga desde
`/monaco/vs/…` y el error de consola ha desaparecido.

### Un fallo de accesibilidad que llevaba meses escondido

En la parte de arriba de cada página hay un enlace de **"Saltar al contenido"**, pensado
para quien navega con teclado. Ese enlace **no llevaba a ninguna parte**: apuntaba a un
sitio que no existía en ninguna página de la aplicación. Para quien usa el teclado con
una pantalla lectora, era un callejón sin salida.

Ahora las tres páginas (portal, editor y reproductor) tienen el destino correcto. Lo
detectó una prueba que nunca se había ejecutado entera.

---

## 2. Cómo está el proyecto ahora

| Comprobación | Resultado |
|---|---|
| Tipos y compilación | **Correcto** |
| Compilación para producción | **Correcta** |
| Pruebas automáticas | **1644 de 1644 pasan** |
| Pruebas en navegador real | **Las 16 ejecutadas enteras al menos una vez.** Ahora **ninguna se hace pasar por buena si no funciona** |
| Comprobación automática en cada cambio | **Montada** (sección 3.6) |

---

## 3. Lo que está roto y NO he arreglado

Lo digo claro porque prefiero que lo sepas.

### 3.1 La publicación en internet (Vercel) — lo más urgente

**Lo primero, y es lo importante: Vercel está publicando OTRO proyecto.**

Tu proyecto en Vercel se llama `abd-omega-editor`, y está conectado al repositorio de
GitHub **`ajabadia/ABDOmegaEditor`**. Pero el proyecto en el que trabajamos se llama
**`ajabadia/ABDOmegaUnified`**. Son dos repositorios **distintos, sin ningún antepasado
común** (lo comprobé: no comparten ni un solo commit).

Traducción: **todo lo que hemos arreglado no está en lo que Vercel publica.** Vercel
sigue con su copia antigua. Por eso el error que recibiste ("No Next.js version detected")
no se arregla cambiando una casilla.

Además, el repositorio que Vercel clona tiene la aplicación **en la raíz**
(`app/`, `src/`, `package.json` directamente), mientras que el nuestro la tiene en la
carpeta `web/`.

**Cuál es el bueno:** el nuestro, `ABDOmegaUnified`. Es donde se ha trabajado hoy, y
tiene el motor de audio, los módulos y las herramientas. `ABDOmegaEditor` parece la
versión antigua.

**Lo que tienes que hacer tú** (no puedo hacerlo yo, es tu cuenta de Vercel):

1. Entra en [vercel.com](https://vercel.com) → proyecto `abd-omega-editor`.
2. Pestaña **Settings** → **Git** → **Disconnect** el repositorio `ABDOmegaEditor`.
3. Pestaña **Settings** → **General** → **Root Directory** → escribe `web` y guarda.
4. Conecta el repositorio `ajabadia/ABDOmegaUnified` y despliega desde `main`.

**Aviso importante:** los arreglos de esta sesión ya están subidos a GitHub, en la rama
`main`. Cuando reconectes Vercel, él construirá esa versión.

### 3.2 "Reset Workspace" ya no deja el documento sucio (ARREGLADO)

**"Reset Workspace" (la opción de menú que deshace todo) dejaba el documento marcado como
"cambios sin guardar", cuando debería dejarlo limpio.** El texto sí volvía a su estado
inicial; el cartel de "cambios sin guardar" se quedaba encendido. **Ya está arreglado.**

Cómo se mide el fallo, porque es lo importante: el cartel no se quedaba encendido todo el
rato. Al pulsar "Reset Workspace" se apagaba al instante y **se volvía a encender unos
200 milisegundos después**, y a partir de ahí ya no se apagaba nunca. Por eso la prueba de
navegador que lo cubría daba verde con el fallo puesto: comprobaba el cartel en un único
momento, y ese momento (justo tras pulsar) era el único en que estaba apagado. La prueba
daba verde 3 de 3 con el fallo presente. Ahora espera a que el programa termine su ciclo
interno y comprueba que el cartel no aparece en ningún momento; **falla 3 de 3 sin el
arreglo y pasa 3 de 3 con él.**

Había dos causas, ambas medidas y ninguna era la que yo sospechaba:

1. Al reiniciar, el programa vaciaba el "punto limpio" del documento y lo dejaba en blanco.
   El cartel se decide comparando el texto actual con ese punto: un texto nunca es igual a
   una cadena vacía, así que el programa concluía "ha cambiado" y lo volvía a marcar.
2. El cálculo del texto tarda una fracción de milisegundo, y el resultado se guardaba
   aunque mientras tanto el documento ya hubiera cambiado otra vez. Un cálculo que empezó
   antes del reinicio se guardaba después, y volvía a manchar el documento recién limpio.

Ahora al reiniciar el programa vuelve a marcar el texto como "punto limpio" (el mismo camino
que ya usa al abrir un documento) y descarta los cálculos que quedaron viejos.

### 3.3 Las pruebas que "pasaban" sin comprobar nada

Buena noticia: **esto ya está resuelto en toda la suite de navegador**, no solo en las tres
primeras. Antes, los tests envolvían su comprobación central en un `try/catch` que, si
fallaba, escribía un mensaje y seguía tan tranquilo. Eso significa que daban igual de
"bien" tanto si la función servía como si estaba rota.

Lo que había debajo era peor de lo que parecía:

- Los de humo escribían el texto en un trozo de memoria que **ya no estaba en pantalla**, así
  que la aplicación nunca se enteraba de que la habías editado. Por eso el cartel de "cambios
  sin guardar" no aparecía nunca: nunca le llegaban los cambios.
- **Una aserción que no podía fallar**: `expect(ancho_del_anillo).toBeGreaterThanOrEqual(0)`.
  Cualquier número es mayor o igual que cero. Ese test daba igual de bueno con el anillo de
  foco roto que con el correcto.
- **Una exportación entera que nunca ocurría**: el test de exportar a `.acepack` escribía "no
  se ha descargado nada" y salía con `return`. Es decir, llevaba tiempo en verde **sin
  exportar nunca**.

Ahora:

- **7 pruebas afirman de verdad y pasan**, entre ellas la de exportar/importar grupo y la del
  anillo de foco.
- **7 quedan marcadas como "pendiente"**, cada una con su motivo escrito dentro del propio
  archivo. Salen como *pendiente* en el informe y **no pueden pasar por buenas**.

### 3.4 Una prueba en rojo en la barra de herramientas

Fallan al pedir que aparezcan cosas en un módulo vacío. Comportamiento real sin
investigar.

### 3.5 El editor de conexiones — **arreglado en parte**

Al ejecutar por fin estas pruebas encontré que fallaban **todas** (22). La causa era de las
pruebas, no de la aplicación:

- Las pruebas declaraban dos "jacks" (conexiones de audio) en el manifiesto pero **sin
  dibujarlos en el rack**. Un tirador de conexión necesita una posición en pantalla, y
  sin dibujar no la hay: solo aparecían 2 de 4.
- Además, **21 de esas pruebas leían una lista vacía sin avisar**. Buscaban un dato
  interno de la aplicación por un nombre que ya no existe, y cuando no lo encontraban
  devolvían "nada" en silencio. Es decir: no estaban comprobando nada.

**Resultado: de 0 pruebas en verde a 13.** Quedan **9 en rojo**, todas del mismo tipo:
intentan pasar el ratón por encima de la línea de conexión o pincharla para
borrarla, y el elemento no aparece. **No está diagnosticado.** Puede ser que el
ratón no alcance la línea, o que la línea no se dibuje; todavía no lo he medido.

### 3.6 Lo que ahora se comprueba solo

**Esto ya no depende de que alguien se acuerde.** Hay una puerta automática que se
ejecuta en cada cambio que se sube, en [GitHub Actions](https://github.com/ajabadia/ABDOmegaUnified/actions):

- **La puerta rápida** (unos 5 minutos): comprueba que los tipos están bien, que las
  1.644 pruebas automáticas pasan, que la aplicación compila, y —esto es lo nuevo— que
  las carpetas que se publican existen de verdad después de compilar. Esa última
  comprobación es la que habría parado que se publicara una web **sin módulos de sonido
  y sin editor de texto**, que es exactamente el problema del punto 3.1.
- **La puerta del navegador** (unos 30 minutos): 12 de los 16 ficheros de pruebas de
  navegador. Si uno de esos se rompe, el cambio no entra.

**Lo que queda fuera, y por qué:**

- Tres ficheros de pruebas que ya están en rojo por motivos conocidos
  (editor de conexiones, barra de herramientas y rack) se ejecutan y se muestran, pero
  **no bloquean**. Si bloquearan, la puerta estaría cerrada siempre y nadie leería el
  informe. En cuanto uno se arregle, pasa a bloquear.
- El motor de audio en el navegador, porque necesita un compilador que no está en el
  servidor de GitHub.

El detalle está en [scripts/README.md](../../scripts/README.md). Para comprobar que la
puerta está sana sin depender de GitHub: `node scripts/verify_ci_workflow.cjs`.

### 3.8 Pruebas de navegador — **cerrado**

Las **16 pruebas de navegador del proyecto se han ejecutado enteras al menos una vez**,
y eso ha cambiado el panorama: las que faltaban **pasaban todas**.

Las últimas cinco (`importar .json`, `rutas de idioma`, `filtros del panel de capas`,
`minimapa` y `proyectos .omega`) suman **34 pruebas, todas en verde**, sin tocar nada.

Lo que queda en rojo en el navegador, con lo medido:

- **9** del editor de conexiones (3.5) — causa sin diagnosticar.
- **3** de la barra de herramientas — piden cosas en un rack que arranca vacío.
- **1** del rack — verificada como anterior a todo este trabajo.
- **7** marcadas como *pendiente* con su motivo escrito (3.3). No son rojas: son medidas y
  están declaradas como lo que son.

---

## 4. Trabajo de otras sesiones

Había **66 ficheros** sin guardar que pertenecían a otras sesiones (persistencia de
sesión, historial, reproductor del rack, puente WASM). **Tú decidiste subirlos también**,
para que GitHub y Vercel dejaran de ver una versión antigua. Están en un commit aparte,
deliberadamente mezclado y etiquetado como trabajo ajeno.

Verificado justo antes de subirlo: tipos correctos, 1644 pruebas en verde, compilación
correcta.

Dos carpetas se quedaron fuera a propósito, con el motivo escrito en `.gitignore`:

- `.freebuff/` — un identificador de esta máquina.
- `web/wasm-runtime/` — 30 MB de código de terceros (WAMR) que verificado que nada del
  proyecto usa.

---

## 5. Lo que propongo hacer ahora, por orden

### 5.1 Subir los cambios a GitHub — **hecho**

Los 15 commits están en `main` en GitHub. Los 66 ficheros de las otras sesiones también,
en un commit aparte. Lo único que queda por tu cuenta es reconectar Vercel (3.1).

### 5.2 Lo siguiente, por orden

1. **Acabar con las 9 pruebas del editor de conexiones** que quedan en rojo (3.5). Ahora
   fallan por un motivo distinto y ya se pueden investigar de verdad.
2. **Arreglar los tres en rojo que hoy no bloquean** (editor de conexiones, barra de
   herramientas, rack), para que la puerta de calidad pueda cerrarse del todo.
3. **Cerrar la puerta de calidad del todo**: hoy los trabajos de navegador que fallan
   están marcados como "no bloquean". Si los tres de arriba quedan verdes, esa excepción se
   puede quitar y el fallo sePara en la puerta, no en un informe.

---

## 6. Una nota sobre cómo trabajo

En esta sesión **cuatro veces estuve a punto de comunicarte un problema que no existía**
o al revés: un fallo de Next.js que no era de Next.js, un módulo que sí se importaba, un
atajo equivocado que era un error mío al leer la lista, un fallo de compilación que
había provocado yo mismo un rato antes.

En todos los casos lo detectó **medir en vez de suponer**. Por eso este documento
distingue siempre entre **"comprobado"** y **"sospechado"**. Si en algún punto lees
"sospecho", es porque no lo he verificado, y no quiero que lo tomes por otra cosa.

Un ejemplo de por qué importa: el editor de texto que no aparecía. Podía haber dicho
"el editor no funciona". Midiendo, descubrí que **el editor funcionaba perfectamente**
y que lo que estaba mal eran las pruebas que lo comprobaban.

Otro, de hoy: el editor de conexiones dibujaba la mitad de los tiradores de conexión y
parecía un fallo de la aplicación. No lo era: las pruebas declaraban unos jacks que
nunca se dibujaban, y **21 de ellas leían una lista vacía sin avisar**. Estaban rotas
las pruebas, y por eso la aplicación parecía peor de lo que es.

---

## 7. Cómo puedes comprobar que esto es cierto

No hace falta que te fíes de mí. Cada afirmación comprobada tiene una forma de revisarla.
En la carpeta `web` salvo donde se dice otra cosa:

- **"Compila bien"** → `npx next build`. Debe terminar sin errores.

- **"Las pruebas automáticas pasan"** →
  `npx jest src/lib src/features/manifest-editor src/services/history.test.ts src/omega-ui-core`
  Deben salir **81 suites y 1644 pruebas, todas en verde**.

- **"El editor no necesita internet"** → `npx jest configureMonacoLoader`. Comprueba que
  el editor se pide a `/monaco/vs` y que en ninguna parte se configura una dirección de
  internet.

- **"Las carpetas se reconstruyen solas"** → desde la raíz del proyecto:
  `node scripts/prepare_public_assets.mjs --check`. En tu ordenador debe decir `junction`
  en cuatro y `materializado` en Monaco.

- **"El enlace de accesibilidad funciona"** → `npx playwright test accessibility -g main-content`.

- **"Las pruebas del editor no fingen"** → `npx playwright test e2e/smoke-tests.spec.ts`.
  Deben salir **2 aprobadas, 3 pendientes (fixme) y ninguna en rojo**.

- **"La puerta automática está sana"** → desde la raíz del proyecto:
  `node scripts/verify_ci_workflow.cjs`. Debe terminar con "El workflow está listo".

Si alguno de esos falla, este documento está equivocado y quiero saberlo antes que nadie.

---

## 8. Qué hacer con el repositorio antiguo `ABDOmegaEditor`

Lo he mirado por dentro. Esto es lo que hay y lo que no hay:

**Vale la pena traer (no existe en el proyecto bueno):**

- **`.agent/`** — un conjunto de reglas y técnicas de trabajo: arquitectura limpia,
  pruebas antes que código, buenas prácticas de React, planificación. Son notas de
  trabajo, no código, y se pueden copiar tal cual.
- **`AGENTS.md` y `CLAUDE.md`** — las instrucciones de trabajo.
- **Historial de cambios** (`CHANGELOG.md`, `ROADMAP.md`) y cuatro documentos de plan.

**No hay que traer:**

- `tools/` y `.github/`: sus dos comprobaciones automáticas. **Ya no hacen falta**: el
  proyecto bueno acaba de montar su propia puerta automática (sección 3.6), y hace más.
- `app/`, `src/`, `public/`, `e2e/`, `package.json`… Eso es **la misma aplicación pero
  en la carpeta de arriba**, y ya la tenemos (dentro de `web/`). Copiarlo sería tener dos
  copias distintas peleándose por lo mismo.

**Lo que decidiste:** no traer nada del repositorio antiguo. Es una decisión razonable —
lo único que de verdad nos faltaba era la puerta automática, y esa ya la tiene el
proyecto bueno. Queda pendiente una sola cosa: **archivar** el repositorio antiguo
cuando Vercel apunte al bueno. No borrarlo: sería tirar algo que nadie ha mirado en
serio, y eso no me corresponde decidirlo a mí.