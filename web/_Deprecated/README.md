# `_Deprecated/` — código retirado del editor

69 ficheros (7.361 líneas) que **nadie usa**. Están aquí, no borrados: si en
algún momento hace falta recuperar alguno, el historial de git conserva además
todo su contenido anterior.

La línea 13 de `src/features/manifest-editor/components/shared/ToastContainer.tsx`
importaba `../ToastContainer`, que **no** existe dentro de esta carpeta (el
fichero real, en `src/`, se queda donde está). Ese import queda roto a propósito:
nada lo compila, y al recuperar el fichero hay que volver a apuntarlo al
componente real.

## Qué hay aquí

Código que quedó atrás y que seguía ocupando sitio sin que nada lo abriera:

- **Componentes reemplazados.** `ModulationGrid.tsx` lo sustituyó
  `VisualModulationMatrix`; el propio proyecto ya lo tenía anotado como
  eliminado en la v9.6.0 y el fichero nunca se borró.
- **Una demostración nunca conectada.** Los ficheros de `src/components/ui/`
  (`AudioShowcase`, `CalibrationPanel`, `ImageGallery`...) son piezas sueltas.
- **Piezas preparadas y no usadas.** `cell-conversion.ts` (516 líneas) traduce
  entre tipos de nodo que ya no se usan entre sí.
- **Tipos de una conversión antigua**, y un test (`useMenuNavigation.spec.ts`,
  33 tests) que solo probaba un hook retirado.

## Por qué están aquí y no borrados

Están movidos, no borrados, para poder recuperarlos sin reconstruir nada. Para
moverlos fuera de aquí y fuera del repositorio, basta con borrar la carpeta.

## El criterio, para poder discutirlo

Un fichero entra aquí si:

1. **Ningún fichero de la aplicación lo importa.** Ni un solo `import` en
   producción, ni carga dinámica, ni `require`.
2. **No es una entrada por convención de Next** (`page.tsx`, `route.ts`,
   `layout.tsx`…), ni un mock de Jest, ni un `barrel` (`index.ts`), ni un
   `.d.ts`, ni algo que carga el plugin de `next-intl`.
3. **Todos los que lo importaban se han movido también**, o no dependen de él
   para nada que siga vivo.

   El caso de `ToastContainer.tsx` cambió el resultado: el fichero era un
   re-export de 14 líneas del componente real. Solo lo importaba
   `accessibility.spec.tsx`, un spec de 806 líneas que prueba muchas cosas
   vivas. En vez de arrastrar el fichero muerto por toda la aplicación para no
   tocar ese test,
   **se cambió una línea del spec**: ahora importa el componente real
   (`components/ToastContainer`, 150 líneas, con 3 importadores vivos), que es lo
   que estaba probando de todas formas a través del alias. El spec sigue
   probando el mismo comportamiento.

## Lo que NO hace esta carpeta

- **No se compila.** Está fuera de `src/` y de `app/` — los `include` de
  [tsconfig.json](../tsconfig.json) no bajan a `_Deprecated/`, aunque sus
  ficheros se llamen `src/...` — así que `tsc` no lo revisa: no puede romper el
  typecheck. Esto es también la razón de que el import roto del `ToastContainer`
  de arriba no moleste.
- **No se vigila en CI.** A propósito: si estuviera, un error aquí bloquearía
  cada despliegue sin que nadie pudiera arreglarlo sin deshacer el congelado.

## Cómo mirar dentro cuando te interesa (bajo demanda)

Existe una forma de typecheckear esta carpeta **sin que toque la suite normal ni
la CI**:

```
npm run typecheck:deprecated            # informa; sale 1 solo si hay errores NUEVOS
npm run typecheck:deprecated:update     # regenera la línea base
```

La primera vez no dice "0 errores", sino **"25 errores relevantes, los 25 ya
conocidos"**. No es decoracion: al congelar, los ficheros se llevaron sus
imports relativos a ficheros que **se quedaron en `src/`**, y esos 25 errores
`TS2307` ("no encuentro el módulo") son lo esperable.

El typecheck además arroja 9 `TS7006` ("implicit any"), pero **se omiten**: cuando
un import falla, todo lo que viene de él es `any`, y esos 9 solo repetirían que
el import está roto. Está comprobado, no supuesto: al arreglar el import de
`CalibrationPanel.tsx` desaparecieron sus 5 `TS7006` junto con el `TS2307`.

El filtro es estrecho a propósito: solo afecta a `TS7006` y **solo en ficheros
que además tienen un import sin resolver**. Un `implicit any` en un fichero sin
imports rotos se conserva y sale en rojo, porque ese sí puede ser un bug real.
Así que si al recuperar un fichero te aparece un `TS7006` nuevo, míralo.

Por eso el script compara contra
[scripts/deprecated-typecheck-baseline.json](../scripts/deprecated-typecheck-baseline.json):
la lista de lo que ya se sabe roto. Solo fallan los errores **nuevos**, que
 significan que alguien ha tocado el código archivado. Y avisa de lo que ya no se
 reproduce, que es justo lo que pasa al recuperar un fichero.

Los tests de esta lógica (20) están en
[scripts/__tests__/check-deprecated-typecheck.spec.ts](../scripts/__tests__/check-deprecated-typecheck.spec.ts)
y van en la suite normal.
- **No se ejecuta.** `next build` no lo ve, porque nada lo importa.
- **No cuenta para los tests.** `jest.config.js` excluye `/_Deprecated/`, así que
  sus tests no forman parte de la suite.

## Aviso sobre `AuditSummary.tsx`

Lo vigila el guard de constantes canónicas
(`src/omega-ui-core/types/__tests__/canonicalDefaults.config.json`), que **escanea
el código fuente** de los ficheros que tiene listados. Si se borra este fichero
sin quitar o reapuntar esa entrada, el guard falla con `ENOENT`. Por eso está
reapuntado a la ruta de aquí, y no eliminado de la lista: así sigue vigilado.

## Cómo recuperarlo

`git log --follow -- _Deprecated/<ruta>` da todo su historial. Y para volver a
usarlo: mover el fichero de vuelta a `src/` y quitar `/_Deprecated/` de
`testPathIgnorePatterns` en [jest.config.js](../jest.config.js).