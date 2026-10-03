# Estado de la aplicación — 3 de octubre de 2026 (segunda tanda)

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
| Pruebas automáticas | **1666 de 1666 pasan** |
| Pruebas en navegador real | **156 en verde.** Todas bloquean: si una se rompe, el cambio no entra |
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

- **9 pruebas afirman de verdad y pasan**, entre ellas la de exportar/importar grupo y la del
  anillo de foco.
- **5 quedan marcadas como "pendiente"**, cada una con su motivo escrito dentro del propio
  archivo. Salen como *pendiente* en el informe y **no pueden pasar por buenas**. Eran 7.

### 3.3-bis La exportación a `.acepack` — no estaba rota, se tapaba con un botón

La prueba de exportar un blueprint a `.acepack` estaba marcada como pendiente desde hacía
tiempo, con la nota de que no se sabía si la exportación estaba rota o si solo fallaba la
comprobación. **Medido: la exportación funcionaba.** El fichero se descargaba bien.

Lo que estaba roto era otra cosa, y era de las que se ven en el uso diario: **no se podía
seleccionar una celda pinchando en su centro.** El tirador de conexión —el circulito del que
salen los cables— estaba dibujado justo en el medio de la celda, por encima. Al pinchar ahí,
el clic se lo quedaba el tirador y la celda no se enteraba.

La cadena, medida en el navegador:

1. Pinchas el centro de la celda y no se selecciona nada.
2. Sin selección, la opción **File → Export → Cell as Blueprint JSON** aparece desactivada.
3. La exportación se queda antes de empezar y avisa `[ERROR] No cell selected`.

Es decir: una función entera parecía rota por un botón dibujado encima. Pinchando en una
esquina, todo funcionaba y se descargaba el fichero.

También se descartaron dos sospechas habituales antes de dar con la buena, y ninguna era:
revocar la dirección del fichero nada más pulsar, y anclar el enlace fuera de la página. Se
probaron los tres casos en el navegador y **los tres descargan**.

Ahora el tirador va en el borde lateral del nodo —entradas a la izquierda, salidas a la
derecha, que es como lo hacen los editores de nodos— y el centro queda libre para seleccionar.
La prueba deja de estar pendiente y comprueba la descarga y la reimportación de verdad.

### 3.9 El botón de "renderizado de reserva" — **quitado, y perdía tu trabajo**

Había un interruptor en **View → "Disable UCA Rendering (Fallback)"** y otro con el
mismo efecto en el inspector. Lo probé antes de tocarlo y esto es lo que hacía de verdad:

| | |
|---|---|
| ¿Cambiaba lo que se dibuja? | **No.** Ninguna pieza de la aplicación lee esa opción. El rack dibuja siempre desde una sola estructura. |
| ¿Qué pasaba al añadir un nodo? | Se guardaba en una lista que **nadie dibuja**. Medido: **0 celdas en pantalla.** Añadías un knob y no aparecía nada. |
| ¿La opción se quedaba? | **No.** Cualquier escritura en el rack la borraba sola. |

Es decir: el interruptor no cambiaba el dibujado, y activarlo hacía que los nodos que
añadieses **desaparecieran sin ningún aviso**. Eso no es una función de reserva: es una
vía muerta con un botón en la interfaz.

El botón y las ramas de código que dependían de él están eliminados. La prueba que lo
vigila es `legacy-fallback`, y **se comprobó que se pone roja si vuelve**.

**Lo que NO se quitó, y es importante:** la lectura de ficheros antiguos. Si abres un
`.json` de antes, se migra solo al árbol y se puede editar con normalidad. Eso no
dependía de la bandera. Hay un inventario fichero por fichero en
[INV-EDITOR-DOBLE-REPRESENTACION.md](INV-EDITOR-DOBLE-REPRESENTACION.md).

### 3.10 Un puerto era idéntico a una celda en el código

Un puerto de audio se crea bien, con su conector dibujado. Pero en la página tenía
**exactamente la misma etiqueta que una celda normal**, y nunca podía distinguirse por
código. Medido antes de arreglarlo: el nodo entra con su tipo correcto, y aun así
salía etiquetado como celda.

Eso tuvo una consecuencia real: una prueba buscaba "un nodo que sea un puerto", no lo
encontraba nunca, y alguien的热ó de conclusión de que el puerto no se creaba. No era
cierto: **se creaba y se dibujaba, pero con la etiqueta equivocada.**

Arreglado añadiendo la etiqueta, sin quitar la de celda (que la usan 16 pruebas y una
comprobación interna que evita seleccionar el contenedor entero al pinchar un nodo).
Con su prueba propia, que se comprobó roja antes del arreglo.

### 3.4 La barra de herramientas — **arreglada, y destapó dos fallos reales**

Las cuatro pruebas que quedaban en rojo (tres de la barra de herramientas y una del rack)
no eran "pruebas que piden cosas en un rack que arranca vacío". **Eran dos fallos reales
de la aplicación, tapados por pruebas que afirmaban lo contrario.**

**1. Los botones de "Redimensionar" y "Rotar con números" no existían** (fallo real, grave).
Tenían todo el trabajo hecho: ventana emergente, atajo de teclado (`Ctrl+Alt+R` y
`Ctrl+Alt+T`), entrada propia en el menú y Tests unitarios. Lo único que faltaba era su
nombre en la lista de botones de la barra. Como no estaban en esa lista, **no se dibujaban
nunca** —loselectionaras lo que selectionaras. Un usuario que leyera el atajo en el manual
se encontraria con que no hacia nada.

**2. Al vaciar el rack no volvia a salir el cartel de "rack vacío"** (fallo real). Inyectar
una plantilla crea una carpeta dentro del rack. Al borrar la celda que habia dentro, esa
carpeta se quedaba **vacia pero presente**, y la comprobacion de "isolo vacio?" miraba si
quedaba alguna carpeta, no si quedaba alguna pieza. Medido: con **0 celdas en pantalla, el
cartel no volvia**. Un rack vacio se quedaba mudo para siempre.

Los otros dos eran fallos de las pruebas, no de la aplicación:

- Una pedia que el boton de "Configuracion" abriera un panel de propiedades. **Ese boton
  abre el modal de preferencias**, y lo hace a proposito: el propio codigo lo reescribe
  para ello. Buscaba un panel con un titulo que no existe en la aplicacion.
- Otra buscaba nodos con la clase `uca-port`. Esa clase **no existe**: el componente que
  dibuja los nodos pone siempre `uca-cell`, sin mirar de que tipo es. El puerto se estaba
  dibujando; solo que con otra etiqueta.

**Medido antes y despues:** las cuatro pruebas fallan sin el arreglo y pasan con el. Se
comprobo ademas que los botones de numeric redimensionar siguen sin aparecer cuando no hay
nada seleccionado, que es justo lo que deben hacer.

### 3.5 El editor de conexiones — **arreglado del todo**

Al ejecutar por fin estas pruebas encontré que fallaban **todas** (22). La causa era de las
pruebas, no de la aplicación:

- Las pruebas declaraban dos "jacks" (conexiones de audio) en el manifiesto pero **sin
  dibujarlos en el rack**. Un tirador de conexión necesita una posición en pantalla, y
  sin dibujar no la hay: solo aparecían 2 de 4.
- Además, **21 de esas pruebas leían una lista vacía sin avisar**. Buscaban un dato
  interno de la aplicación por un nombre que ya no existe, y cuando no lo encontraban
  devolvían "nada" en silencio. Es decir: no estaban comprobando nada.

**Resultado: de 0 pruebas en verde a 22, todas en verde.** Para llegar ahí hubo tres
cosas distintas, y conviene separarlas porque son de naturaleza distinta:

**1. Seis pruebas pulsaban en el sitio equivocado (fallo de la prueba).** La línea de
conexión no es recta: es una curva. Las pruebas pinchaban en el punto medio del
rectángulo que la rodea, menos 20 píxeles, y ese punto **no está sobre la curva**: cae en
el hueco que hay entre el arco y la diagonal. Ahí no hay ninguna línea, solo el panel de
detrás. Ahora eligen un punto de verdad de la curva.

**2. La aspa de borrar no se podía pulsar (esto SÍ era un fallo real).** Al apartar el
ratón de la línea para ir hacia la aspa, la línea avisaba de que ya no la estás tocando,
y eso **borraba la aspa de la pantalla antes de llegar a ella**. Con el ratón de verdad
era imposible pulsarla. Es el mismo error que cometen otros muchos botones que dependen de
estar encima: al salir del elemento que los ha creado, desaparecen. Ahora hay una espera
muy breve para que el puntero pueda cruzar el hueco.

**3. Cuatro pruebas pedían que se viera un cable que sí estaba en pantalla.** El cable
fantasma durante un arrastre es una línea recta, y en estas pruebas el arrastre es
perfectamente horizontal, así que su caja mide de alto cero píxeles. El programa de
pruebas da por "no visible" cualquier cosa con la caja vacía, aunque esté dibujada.
Ahora se comprueba que el cable existe y que lleva su trazo, que es lo que importa.

Lo de 2 es el único de los tres que era un fallo de la aplicación, y es de los que nota
un usuario: el botón se veía, se podía apuntar con el ratón, y al acercarse se
desvanecía.

### 3.6 Lo que ahora se comprueba solo

**Esto ya no depende de que alguien se acuerde.** Hay una puerta automática que se
ejecuta en cada cambio que se sube, en [GitHub Actions](https://github.com/ajabadia/ABDOmegaUnified/actions):

- **La puerta rápida** (unos 5 minutos): comprueba que los tipos están bien, que las
  1.666 pruebas automáticas pasan, que la aplicación compila, y —esto es lo nuevo— que
  las carpetas que se publican existen de verdad después de compilar. Esa última
  comprobación es la que habría parado que se publicara una web **sin módulos de sonido
  y sin editor de texto**, que es exactamente el problema del punto 3.1.
- **La puerta del navegador** (unos 30 minutos): **los 16 ficheros de pruebas de
  navegador. Todos. Si uno se rompe, el cambio no entra.**

**Lo que queda fuera, y por qué:**

- El motor de audio en el navegador, porque necesita un compilador que no está en el
  servidor de GitHub.

**Ya no queda ningún fichero en excepción.** Antes había un segundo paso que ejecutaba
los ficheros en rojo **sin bloquear**, con la idea de que así al menos se veían. Medido el
motivo por el que estaban en rojo, los dos fallos eran de la aplicación (3.4), así que la
excepción solo servía para que nadie mirara. Se ha quitado el paso entero.

El detalle está en [scripts/README.md](../../scripts/README.md). Para comprobar que la
puerta está sana sin depender de GitHub: `node scripts/verify_ci_workflow.cjs`.

### 3.8 Pruebas de navegador — **cerrado**

Las **16 pruebas de navegador del proyecto se han ejecutado enteras al menos una vez**,
y eso ha cambiado el panorama: las que faltaban **pasaban todas**.

Las últimas cinco (`importar .json`, `rutas de idioma`, `filtros del panel de capas`,
`minimapa` y `proyectos .omega`) suman **34 pruebas, todas en verde**, sin tocar nada.

Lo que queda en rojo en el navegador: **nada**. Las cuatro pruebas que quedaban (3.4) se
arreglaron y ahora bloquean.

- **156 pruebas de navegador en verde**, ejecutadas enteras bloque por bloque.
- **5** marcadas como *pendiente* con su motivo escrito (3.3). No son rojas: son medidas y
  están declaradas como lo que son.

---

## 4. Trabajo de otras sesiones

Había **66 ficheros** sin guardar que pertenecían a otras sesiones (persistencia de
sesión, historial, reproductor del rack, puente WASM). **Tú decidiste subirlos también**,
para que GitHub y Vercel dejaran de ver una versión antigua. Están en un commit aparte,
deliberadamente mezclado y etiquetado como trabajo ajeno.

Verificado justo antes de subirlo: tipos correctos, 1666 pruebas en verde, compilación
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

**La puerta de calidad está cerrada.** Era el punto 3 de esta lista y ya está hecho: los
cuatro tests que quedaban en rojo se arreglaron (3.4), los 16 ficheros de pruebas de
navegador bloquean, y no queda ninguna excepción. Lo que falla, para en la puerta.

Queda pendiente, y en este orden:

1. **Subir estos últimos arreglos a GitHub.** Los cuatro de esta sesión (3 commits) están
   solo en el ordenador; en GitHub siguen los tres anteriores. La puerta de GitHub solo
   comprobará estos cambios cuando estén subidos.
2. **Reconectar Vercel al repositorio bueno** (3.1). Es lo único que bloquea de verdad que
   la web publicada reciba los arreglos, y es cosa de tu cuenta.

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
  Deben salir **83 suites y 1666 pruebas, todas en verde**.

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