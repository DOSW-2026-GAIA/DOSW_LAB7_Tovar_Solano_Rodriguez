# Informe de laboratorio · CI/CD multinube

Laboratorio CI/CD multinube · App ToDo · DOSW 2026-2.

Las respuestas se basan en evidencias reales de este repositorio, guardadas en `docs/ci-cd-evidencias/`.

**Video final:** pendiente de publicar. El enlace se agrega aquí y en el README cuando esté listo.

---

## 1. Integración continua, entrega continua y despliegue continuo

La **integración continua** es que cada cambio que se sube se compile y se pruebe automáticamente. Así los errores aparecen en el momento en que alguien integra su código, y no semanas después. La **entrega continua** va un paso más allá: si el código pasa, queda empaquetado y listo para instalarse en cualquier momento, pero alguien decide cuándo. En el **despliegue continuo** no hay ese paso humano, y todo lo que pasa las pruebas llega solo a producción.

Nosotras implementamos integración continua y entrega continua, pero no despliegue continuo.

- **Integración continua:** `ci-quality.yml` corre en cada push y en cada pull request hacia `develop` y `main`. En el PR de la Parte A se ejecutó una vez por cada commit que subimos.
- **Entrega continua:** cuando el cambio llega a `main`, el mismo workflow publica en GHCR las imágenes `-api` y `-web` con la etiqueta `sha-b0648b15b2066c8e6067966bef428e5bc585feb0`. Esa versión queda lista, pero no se instala sola.
- **Sin despliegue continuo:** los workflows de Azure y AWS solo tienen `workflow_dispatch`. El primer despliegue a Azure (ejecución `41952727980`) lo lanzó a mano Mariana (`Marix201`) desde *Run workflow*. Lo elegimos así porque las VMs no están siempre encendidas y los créditos son limitados: con despliegue automático, cada merge a `main` dejaría un job esperando un runner apagado.

## 2. Por qué `publish-images` depende de las pruebas y del análisis estático

En `ci-quality.yml`, el job `publish-images` tiene `needs: [backend-quality, frontend-quality]`. Si cualquiera de los dos falla, el job ni siquiera arranca y no se publica ninguna imagen.

Lo comprobamos con un fallo controlado. La Parte A la hicimos cada una en su repositorio personal; este caso es del PR #4 de [DOSW_LAB6_Rodriguez](https://github.com/nataliaRT12/DOSW_LAB6_Rodriguez/pull/4):

- En el commit `edc39cf` cambiamos en `AdminServiceTest` el valor esperado de `totalUsers` de 3 a 4. La ejecución `41934837626` quedó en rojo en `backend-quality` (`02-ci-fallo-controlado.png`, `03-ci-fallo-log.png`).
- En `338c292` devolvimos el valor a 3 y la ejecución `41935253947` volvió a verde (`04-ci-corregido.png`).

Si la publicación no dependiera de la calidad, ese commit roto se habría convertido en una imagen con su etiqueta SHA, y cualquiera podría desplegarla en Azure o AWS sin saber que tenía una prueba fallando. La etiqueta en GHCR tiene que significar que esa versión pasó todo, no solo que compiló.

Además, `publish-images` tiene la condición `github.event_name == 'push' && github.ref == 'refs/heads/main'`. Por eso en el despliegue manual a Azure el job aparece como *skipped*: la imagen ya existía desde el push a `main` y no se vuelve a construir.

## 3. Qué verifica JaCoCo y qué no permite concluir una cobertura del 100 %

JaCoCo mide qué líneas y ramas del código se ejecutaron mientras corrían las pruebas. En el `pom.xml` lo configuramos con la regla `jacoco-check` sobre todo el proyecto (`BUNDLE`): si la cobertura de líneas baja de `0.80`, `mvn verify` falla y el pipeline queda en rojo. Excluimos `TodoApiApplication`, porque solo arranca Spring y no tiene lógica que probar.

Con las 89 pruebas del backend llegamos a **91,5 % de líneas**. El reporte HTML queda en el artifact `backend-jacoco` de cada ejecución (`01-ci-pr-verde.png`).

Lo que JaCoCo no dice es si las pruebas comprueban lo correcto. Una línea cuenta como cubierta aunque la prueba que la ejecutó no revise el resultado. El fallo controlado lo muestra al revés:

- Con la aserción cambiada a 4, la cobertura era la misma, porque las mismas líneas se seguían ejecutando.
- Lo que hizo fallar el pipeline fue la aserción, no JaCoCo.

Por eso, incluso un 100 % no permite concluir que el código no tiene errores. Tampoco garantiza que funcione con datos reales, que la integración con PostgreSQL o con el frontend esté bien, ni que se hayan probado los casos límite que nadie pensó. Para eso están las pruebas de integración y los smoke tests del despliegue: comprobar `/health` y el 401 sin token.

## 4. ESLint y SpotBugs: hallazgos reales

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

## 5. Por qué dos Dockerfiles multietapa y qué queda en cada imagen final

Usamos un Dockerfile multietapa para cada parte porque las herramientas que se necesitan para compilar no se necesitan para ejecutar. Si quedaran en la imagen final, esta sería más pesada, tardaría más en descargarse en cada VM y tendría más programas que pueden traer vulnerabilidades.

**Backend (`backend/Dockerfile`)**

- **Primera etapa:** usa `maven:3.9-eclipse-temurin-21`. Copia el `pom.xml`, descarga las dependencias, que quedan en caché mientras no cambie el `pom.xml`, y empaqueta el `.jar` con `-DskipTests`. Las pruebas no se saltan en realidad: ya corrieron en el pipeline antes de llegar a la publicación.
- **Imagen final:** usa `eclipse-temurin:21-jre`. Solo tiene el JRE de Java 21 y el `app.jar`, y corre con un usuario `app` sin privilegios. No lleva Maven, el JDK ni el código fuente.

**Frontend (`frontend/Dockerfile`)**

- **Primera etapa:** usa `node:22-alpine`. Instala las dependencias con `npm ci` y genera el build de Vite.
- **Imagen final:** usa `nginx:alpine`. Solo tiene los archivos estáticos de `dist` y nuestro `nginx.conf`, que sirve la aplicación, responde `/health` y redirige `/api/` al contenedor `backend`. No lleva Node.js, `node_modules` ni el código fuente.

Ninguna de las dos imágenes tiene secretos adentro. La contraseña de PostgreSQL y el secreto JWT se pasan como variables de entorno cuando arranca el contenedor. Así la misma imagen `sha-b0648b1…` sirvió en Azure y sirve en AWS, cada una con sus propios secretos.

## 6. Imagen frente a contenedor y contenido de `todo_pgdata`

Una **imagen** es una plantilla de solo lectura: capas con el sistema de archivos y la aplicación ya empaquetados, identificada por un nombre y una etiqueta (por ejemplo `ghcr.io/marix201/dosw_lab7_tovar-api:sha-6b7603f...`). Un **contenedor** es una instancia en ejecución de esa imagen, con su propia capa de escritura que se pierde cuando se elimina. De la misma imagen pueden salir muchos contenedores, y al hacer `down` desaparecen sin afectar a la imagen.

La diferencia se vio en el rollback de Azure (`mariana-azure-10-rollback.png`). Al cambiar `IMAGE_TAG` y ejecutar `up -d`, Docker recreó solo el backend y el frontend (`Up 32 seconds`), porque su imagen cambió, y dejó la base de datos con `Up 26 minutes (healthy)`, porque la suya no.

`todo_pgdata` es un volumen con nombre montado en `/var/lib/postgresql/data` del contenedor `db`. Guarda los archivos de datos de PostgreSQL: las tablas `users`, `tasks` y `categories` con todas las filas que crean los usuarios. Vive fuera del contenedor, y por eso sobrevive: tras `docker compose down` y `up -d`, la tarea `Tarea Azure - Mariana` seguía en la lista (`mariana-azure-09.png`). Compose antepone el nombre del proyecto al volumen: al cambiar el proyecto a `todo-mariana` se creó un volumen nuevo y vacío, `todo-mariana_todo_pgdata`, y el anterior, `todo-lab_todo_pgdata`, quedó intacto. Por eso el usuario demo no existía en el volumen nuevo y hubo que registrarlo otra vez. Los scripts SQL de `database/` solo se ejecutan cuando el volumen está vacío, y no usamos `down -v` porque borraría los datos.

## 7. Qué información identifica la etiqueta `sha-COMMIT` y por qué es preferible a `latest`

La etiqueta `sha-<COMMIT>` contiene el hash completo de 40 caracteres del commit de Git que disparó el pipeline. En `.github/workflows/ci-quality.yml` el job `publish-images` la construye como `sha-${GITHUB_SHA}` y la aplica a las dos imágenes, `-api` y `-web`. La primera versión publicada en GHCR para este repositorio quedó etiquetada como `sha-b0648b15b2066c8e6067966bef428e5bc585feb0`, que corresponde al commit `b0648b1` en `main` (merge de `develop` en `main`).

Es preferible a desplegar siempre `latest` por tres razones:

- **Es inmutable y trazable.** Una etiqueta SHA siempre apunta al mismo código, así que se puede saber exactamente qué versión corre en cada nube. `latest` cambia con cada publicación y no indica qué hay dentro.
- **Permite desplegar lo mismo en varias nubes.** Azure y AWS descargan exactamente las mismas imágenes que el CI ya verificó con pruebas, cobertura y análisis estático.
- **Hace posible el rollback.** Volver atrás consiste en cambiar `IMAGE_TAG` en el `.env` de la máquina al SHA anterior y ejecutar `docker compose pull` y `up -d`. Con `latest` no habría una versión anterior a la cual volver.

## 7. ¿Por qué se utilizan etiquetas SHA para las imágenes Docker?

Se utilizan etiquetas SHA porque permiten identificar exactamente la versión del código con la que se construyó una imagen Docker. A diferencia de etiquetas como `latest`, que pueden apuntar a versiones diferentes con el tiempo, una etiqueta SHA permite relacionar la imagen con un commit específico del repositorio.

En este laboratorio, la primera imagen publicada en GHCR utilizó la etiqueta `sha-b0648b15b2066c8e6067966bef428e5bc585feb0`. Para el despliegue actual en AWS se utilizaron las imágenes correspondientes al commit `0affafa5fb5c0c6611624d1e0bab73fb843db4c7`.

Esto facilita identificar qué versión está desplegada, mantener la trazabilidad entre el código y las imágenes y recuperar una versión anterior si se presenta algún problema.

## 8. ¿Por qué se utilizan rutas relativas para las peticiones del frontend?

El frontend utiliza rutas relativas como `/api` para realizar las peticiones al backend, en lugar de tener escrita directamente la dirección IP o el dominio de una nube.

Esto permite que la misma imagen del frontend funcione tanto en Azure como en AWS sin tener que modificar el código para cada despliegue. El proxy inverso se encarga de recibir las peticiones y dirigir las que comienzan por `/api` hacia el backend correspondiente.

De esta manera, se facilita el despliegue en diferentes entornos y se evita depender de una dirección específica dentro del código del frontend.

## 10. ¿Qué diferencias y similitudes existen entre los despliegues en Azure y AWS?

Los dos despliegues utilizan la misma aplicación ToDo y las imágenes Docker publicadas en GitHub Container Registry (GHCR). En ambos casos se utiliza Docker Compose para levantar los servicios de la aplicación, incluyendo el frontend, backend y base de datos.

La principal diferencia está en la infraestructura utilizada. Azure y AWS tienen máquinas virtuales independientes, con sus propias configuraciones, variables de entorno y bases de datos. También tienen dominios diferentes:

- Azure: https://158.158.73.237.sslip.io/
- AWS: https://34.229.78.194.sslip.io/

En AWS se utilizó una instancia EC2 con Ubuntu y Docker Compose. Para este despliegue, las imágenes utilizadas corresponden al commit `0affafa5fb5c0c6611624d1e0bab73fb843db4c7`.

Aunque ambos entornos comparten el código y el proceso de construcción de las imágenes, funcionan de manera independiente. Por eso, un problema en la infraestructura o base de datos de una nube no afecta directamente a la otra.

## 12. ¿Cómo se garantiza la independencia entre las bases de datos de Azure y AWS?

Cada nube tiene su propia máquina virtual, su propio servicio PostgreSQL y su propio volumen de Docker para almacenar los datos. Esto significa que los datos creados en Azure no se replican automáticamente en AWS, ni al contrario.

En ambos despliegues se utilizan las mismas imágenes de la aplicación, pero cada entorno tiene su propia configuración y sus propios secretos, como las credenciales de la base de datos y la clave JWT.

Por lo tanto, aunque las dos nubes ejecutan la misma aplicación, sus bases de datos funcionan de forma independiente. Si una de las máquinas virtuales se detiene o presenta un problema, la información almacenada en la otra nube no se ve afectada.

**Evidencias:** `aws-10-independenciaAzure.png` y `aws-10-independenciaAWS.png`.

## 14. ¿Qué sucede con los costos al finalizar el laboratorio?

En AWS Academy, al revisar el estado del laboratorio, el indicador mostraba un consumo de **$0 de los $50 disponibles**. Esto indica que no se había registrado consumo del crédito asignado en ese momento.

Para Azure no se cuenta con una medición de costos confirmada, por lo que no se realiza una comparación de valores entre ambas nubes.

Es importante apagar o detener los recursos que no se estén utilizando al finalizar el laboratorio, ya que algunos servicios, como los discos o las direcciones IP públicas, pueden seguir generando costos dependiendo de su configuración.
## 15. Dificultad técnica real y cómo se diagnosticó

La dificultad principal fue un **403 al iniciar sesión desde el navegador** con el pipeline y el despliegue en verde. Lo diagnosticamos por descarte con `curl`:

1. El registro y el login sin cabecera `Origin` respondían 201 y 200, lo que descartaba la aplicación, el JWT, PostgreSQL, Caddy y la VM.
2. La misma petición de login con `Origin: https://158.158.73.237.sslip.io`, que es lo que envía un navegador, respondía 403 con `vary: Origin` en los encabezados. Eso apuntaba al filtro CORS de Spring.

La causa probable es que Spring recibe la petición por HTTP en el puerto 8080 detrás de dos proxies (Caddy y Nginx), y si no interpreta los encabezados `X-Forwarded-*` ve el origen HTTPS como ajeno. El despliegue vigente configura `SERVER_FORWARD_HEADERS_STRATEGY: framework` en el backend y reenvía `X-Forwarded-Host`, `X-Forwarded-Proto` y `X-Forwarded-Port` en Nginx. Con ese despliegue la misma petición con `Origin` dejó de dar 403: respondió 401 con un usuario inexistente y 200 una vez registrado, y el login desde el navegador funciona (`mariana-azure-06-app-https.png`).

Una segunda dificultad fue que el proyecto Compose heredado de la plantilla se llamaba `todo-lab` y compartía volumen con un despliegue previo en la VM. Lo separamos con `name: todo-mariana` (PR #5), lo que creó un volumen propio, y por eso el usuario demo tuvo que registrarse de nuevo.
