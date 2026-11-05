# Informe · Laboratorio CI/CD multinube

**Equipo:** Tovar, Solano y Rodríguez
**Repositorio:** [DOSW_LAB7_Tovar_Solano_Rodriguez](https://github.com/nataliaRT12/DOSW_LAB7_Tovar_Solano_Rodriguez)

Las respuestas se basan en lo que pasó en nuestras ejecuciones. Las capturas están en [ci-cd-evidencias](ci-cd-evidencias).

## 1. Integración continua, entrega continua y despliegue continuo

La **integración continua** es que cada cambio que se sube se compile y se pruebe automáticamente. Así los errores aparecen en el momento en que alguien integra su código, y no semanas después. La **entrega continua** va un paso más allá: si el código pasa, queda empaquetado y listo para instalarse en cualquier momento, pero alguien decide cuándo. En el **despliegue continuo** no hay ese paso humano, y todo lo que pasa las pruebas llega solo a producción.

Nosotras implementamos integración continua y entrega continua, pero no despliegue continuo.

- **Integración continua:** `ci-quality.yml` corre en cada push y en cada pull request hacia `develop` y `main`. En el PR de la Parte A se ejecutó una vez por cada commit que subimos.
- **Entrega continua:** cuando el cambio llega a `main`, el mismo workflow publica en GHCR las imágenes `-api` y `-web` con la etiqueta `sha-b0648b15b2066c8e6067966bef428e5bc585feb0`. Esa versión queda lista, pero no se instala sola.
- **Sin despliegue continuo:** los workflows de Azure y AWS solo tienen `workflow_dispatch`. El primer despliegue a Azure (ejecución `41952727980`) lo lanzó a mano Mariana (`Marix201`) desde *Run workflow*. Lo elegimos así porque las VMs no están siempre encendidas y los créditos son limitados: con despliegue automático, cada merge a `main` dejaría un job esperando un runner apagado.

## 2. Por qué `publish-images` depende de las pruebas y del análisis

En `ci-quality.yml`, el job `publish-images` tiene `needs: [backend-quality, frontend-quality]`. Si cualquiera de los dos falla, el job ni siquiera arranca y no se publica ninguna imagen.

Lo comprobamos con un fallo controlado. La Parte A la hicimos cada una en su repositorio personal; este caso es del PR #4 de [DOSW_LAB6_Rodriguez](https://github.com/nataliaRT12/DOSW_LAB6_Rodriguez/pull/4):

- En el commit `edc39cf` cambiamos en `AdminServiceTest` el valor esperado de `totalUsers` de 3 a 4. La ejecución `41934837626` quedó en rojo en `backend-quality` ([02-ci-fallo-controlado.png](ci-cd-evidencias/02-ci-fallo-controlado.png), [03-ci-fallo-log.png](ci-cd-evidencias/03-ci-fallo-log.png)).
- En `338c292` devolvimos el valor a 3 y la ejecución `41935253947` volvió a verde ([04-ci-corregido.png](ci-cd-evidencias/04-ci-corregido.png)).

Si la publicación no dependiera de la calidad, ese commit roto se habría convertido en una imagen con su etiqueta SHA, y cualquiera podría desplegarla en Azure o AWS sin saber que tenía una prueba fallando. La etiqueta en GHCR tiene que significar que esa versión pasó todo, no solo que compiló.

Además, `publish-images` tiene la condición `github.event_name == 'push' && github.ref == 'refs/heads/main'`. Por eso en el despliegue manual a Azure el job aparece como *skipped*: la imagen ya existía desde el push a `main` y no se vuelve a construir.

## 3. Qué verifica JaCoCo y qué no permite concluir

JaCoCo mide qué líneas y ramas del código se ejecutaron mientras corrían las pruebas. En el `pom.xml` lo configuramos con la regla `jacoco-check` sobre todo el proyecto (`BUNDLE`): si la cobertura de líneas baja de `0.80`, `mvn verify` falla y el pipeline queda en rojo. Excluimos `TodoApiApplication`, porque solo arranca Spring y no tiene lógica que probar.

Con las 89 pruebas del backend llegamos a **91,5 % de líneas**. El reporte HTML queda en el artifact `backend-jacoco` de cada ejecución ([01-ci-pr-verde.png](ci-cd-evidencias/01-ci-pr-verde.png)).

Lo que JaCoCo no dice es si las pruebas comprueban lo correcto. Una línea cuenta como cubierta aunque la prueba que la ejecutó no revise el resultado. El fallo controlado lo muestra al revés:

- Con la aserción cambiada a 4, la cobertura era la misma, porque las mismas líneas se seguían ejecutando.
- Lo que hizo fallar el pipeline fue la aserción, no JaCoCo.

Por eso, incluso un 100 % no permite concluir que el código no tiene errores. Tampoco garantiza que funcione con datos reales, que la integración con PostgreSQL o con el front-end esté bien, ni que se hayan probado los casos límite que nadie pensó. Para eso están las pruebas de integración y los smoke tests del despliegue: comprobar `/health` y el 401 sin token.

## 4. ESLint y SpotBugs

Las dos herramientas hacen análisis estático, es decir, revisan el código sin ejecutarlo. ESLint corre en `frontend-quality` con `npm run lint`. SpotBugs corre dentro de `mvn verify`, con `effort=Max` y `threshold=Medium`. En los dos casos, un hallazgo hace fallar el job y, por lo tanto, bloquea la publicación de imágenes.

Las dos encontraron problemas reales la primera vez que las corrimos.

**ESLint (3 errores).** Antes usábamos oxlint y lo cambiamos por ESLint con las reglas de React Hooks y React Refresh.

- **`react-refresh/only-export-components`:** `AuthContext.jsx` exportaba el componente `AuthProvider` junto con el contexto y el hook `useAuth`. Eso rompe la recarga en caliente de Vite. Movimos `AuthContext` y `useAuth` a un archivo nuevo, `useAuth.js`, y actualizamos los imports.
- **`react-hooks/set-state-in-effect`:** en `useTasks.js`, el `useEffect` llamaba a una función que cambiaba el estado de forma síncrona, lo que provoca renders de más. Ahora el efecto llama a `taskApi.getTasks` y actualiza el estado en el `.then`, `.catch` y `.finally` de la promesa. Además, una bandera `active` evita actualizar el estado si el componente ya se desmontó.

**SpotBugs (5 hallazgos de prioridad media).** Todos eran de las categorías `EI_EXPOSE_REP` y `EI_EXPOSE_REP2`, es decir, objetos mutables que se guardan o se devuelven sin copiarlos.

- **Corregido:** en `AdminSummaryResponse`, el record guardaba directamente el `Map` de tareas por estado. Quien lo recibiera podía modificarlo desde afuera. Agregamos un constructor compacto que hace una copia y la envuelve en `Collections.unmodifiableMap`.
- **Excluidos con justificación** en `spotbugs-exclude.xml`:
  - Los constructores de los controladores, porque Spring inyecta ahí los servicios y guardar esa referencia es justamente lo esperado.
  - `getOwner` y `setOwner` de `TaskEntity`, porque JPA necesita la referencia a la entidad administrada y una copia rompería la relación.

No desactivamos ningún detector en general. Cada exclusión está limitada a la clase y al método exactos.

## 5. Dockerfiles multietapa y contenido de cada imagen

Usamos un Dockerfile multietapa para cada parte porque las herramientas que se necesitan para compilar no se necesitan para ejecutar. Si quedaran en la imagen final, esta sería más pesada, tardaría más en descargarse en cada VM y tendría más programas que pueden traer vulnerabilidades.

**Backend ([backend/Dockerfile](../backend/Dockerfile))**

- **Primera etapa:** usa `maven:3.9-eclipse-temurin-21`. Copia el `pom.xml`, descarga las dependencias, que quedan en caché mientras no cambie el `pom.xml`, y empaqueta el `.jar` con `-DskipTests`. Las pruebas no se saltan en realidad: ya corrieron en el pipeline antes de llegar a la publicación.
- **Imagen final:** usa `eclipse-temurin:21-jre`. Solo tiene el JRE de Java 21 y el `app.jar`, y corre con un usuario `app` sin privilegios. No lleva Maven, el JDK ni el código fuente.

**Frontend ([frontend/Dockerfile](../frontend/Dockerfile))**

- **Primera etapa:** usa `node:22-alpine`. Instala las dependencias con `npm ci` y genera el build de Vite.
- **Imagen final:** usa `nginx:alpine`. Solo tiene los archivos estáticos de `dist` y nuestro `nginx.conf`, que sirve la aplicación, responde `/health` y redirige `/api/` al contenedor `backend`. No lleva Node.js, `node_modules` ni el código fuente.

Ninguna de las dos imágenes tiene secretos adentro. La contraseña de PostgreSQL y el secreto JWT se pasan como variables de entorno cuando arranca el contenedor. Así la misma imagen `sha-b0648b1…` sirvió en Azure y sirve en AWS, cada una con sus propios secretos.

## 6. Imagen y contenedor, y contenido de `todo_pgdata`

_Pendiente._

## 7. Etiqueta `sha-COMMIT` frente a `latest`

_Pendiente._

## 8. Proxy `/api/...` en lugar de `localhost:8080`

_Pendiente._

## 9. Protección de secretos y acceso Docker del runner

_Pendiente._

## 10. Qué cambió y qué no entre Azure y AWS

_Pendiente._

## 11. Pipeline verde con la aplicación fallando

_Pendiente._

## 12. Por qué las tareas de Azure no aparecen en AWS

_Pendiente._

## 13. Fallo de imagen con el esquema ya modificado

_Pendiente._

## 14. Recursos que siguen generando costo

_Pendiente._

## 15. Dificultad técnica real

_Pendiente._
