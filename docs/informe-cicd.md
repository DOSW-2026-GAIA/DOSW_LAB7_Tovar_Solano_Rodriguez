# Informe de laboratorio · CI/CD multinube

Laboratorio CI/CD multinube · App ToDo · DOSW 2026-2.

Las respuestas se basan en evidencias reales de este repositorio, guardadas en `docs/ci-cd-evidencias/`. Cada integrante completa las preguntas que le corresponden:

| Integrante | Preguntas |
|---|---|
| Natalia | 1, 2, 3, 4, 5 |
| Mariana | 6, 9, 11, 13, 15 |
| Paula | 7, 8, 10, 12, 14 |

**Video final:** pendiente de publicar. El enlace se agrega aquí y en el README cuando esté listo.

---

## 1. Integración continua, entrega continua y despliegue continuo

*Responsable: Natalia.* Pendiente.

## 2. Por qué `publish-images` depende de las pruebas y del análisis estático

*Responsable: Natalia.* Pendiente.

## 3. Qué verifica JaCoCo y qué no permite concluir una cobertura del 100 %

*Responsable: Natalia.* Pendiente.

## 4. ESLint y SpotBugs: hallazgos reales

*Responsable: Natalia.* Pendiente.

## 5. Por qué dos Dockerfiles multietapa y qué queda en cada imagen final

*Responsable: Natalia.* Pendiente.

## 6. Imagen frente a contenedor y contenido de `todo_pgdata`

*Responsable: Mariana.* Pendiente.

## 7. Qué información identifica la etiqueta `sha-COMMIT` y por qué es preferible a `latest`

La etiqueta `sha-<COMMIT>` contiene el hash completo de 40 caracteres del commit de Git que disparó el pipeline. En `.github/workflows/ci-quality.yml` el job `publish-images` la construye como `sha-${GITHUB_SHA}` y la aplica a las dos imágenes, `-api` y `-web`. La primera versión publicada en GHCR para este repositorio quedó etiquetada como `sha-b0648b15b2066c8e6067966bef428e5bc585feb0`, que corresponde al commit `b0648b1` en `main` (merge de `develop` en `main`).

Es preferible a desplegar siempre `latest` por tres razones:

- **Es inmutable y trazable.** Una etiqueta SHA siempre apunta al mismo código, así que se puede saber exactamente qué versión corre en cada nube. `latest` cambia con cada publicación y no indica qué hay dentro.
- **Permite desplegar lo mismo en varias nubes.** Azure y AWS descargan exactamente las mismas imágenes que el CI ya verificó con pruebas, cobertura y análisis estático.
- **Hace posible el rollback.** Volver atrás consiste en cambiar `IMAGE_TAG` en el `.env` de la máquina al SHA anterior y ejecutar `docker compose pull` y `up -d`. Con `latest` no habría una versión anterior a la cual volver.

## 8. Por qué React consume `/api/...` con un proxy y no `localhost:8080`

El código de React se ejecuta en el navegador de cada usuario, no en el servidor. Si el frontend llamara a `http://localhost:8080`, el navegador intentaría conectarse a la máquina del propio usuario, donde no existe ningún backend. Además, el puerto 8080 no se publica hacia afuera: en `infra/docker-compose.prod.yml` solo el servicio `proxy` expone los puertos 80 y 443, y el backend queda dentro de la red interna de Docker. Una llamada HTTP a otro origen desde una página servida por HTTPS también sería bloqueada por el navegador (contenido mixto) y exigiría configurar CORS.

Por eso el frontend usa rutas relativas (`/api/v1/...`), en el mismo origen de la página:

- **En desarrollo**, el proxy de Vite (`server.proxy` en `frontend/vite.config.js`) redirige `/api` a `http://localhost:8080`.
- **En producción**, el Nginx del contenedor `frontend` (`frontend/nginx.conf`, bloque `location /api/`) reenvía las peticiones a `backend:8080` por la red interna, y Caddy publica todo por HTTPS en el dominio del despliegue.

El cambio quedó registrado en el commit `feat: call the api through relative /api paths with a vite dev proxy`.

## 9. Cómo se protegieron los secretos JWT y de PostgreSQL

*Responsable: Mariana.* Pendiente.

## 10. Qué cambió entre el despliegue en Azure y AWS y qué no cambió

*Responsable: Paula.* Pendiente: se completa con los datos reales de los dos despliegues (evidencias `azure-*` y `aws-*`).

## 11. Pipeline verde con la aplicación fallando

*Responsable: Mariana.* Pendiente.

## 12. Por qué las tareas creadas en Azure no aparecen en la base de datos de AWS

Cada nube ejecuta su propio stack de Docker Compose, con su propio contenedor de PostgreSQL y su propio volumen `todo_pgdata`, que es local a la máquina donde corre (la VM de Azure o la instancia EC2 de AWS). No existe replicación ni conexión entre las dos bases de datos. Una tarea se guarda en la base del entorno que atendió la petición, así que la creada en Azure no existe en AWS, ni al revés.

Lo único compartido es el código: las dos nubes descargan las mismas imágenes inmutables, identificadas por SHA, desde GHCR. Los datos y los secretos son independientes: cada environment de GitHub (`azure-lab` y `aws-lab`) tiene su propio `DB_PASSWORD` y su propio `JWT_SECRET`, por lo que además un token emitido en una nube no es válido en la otra.

Evidencia: `aws-10-independencia.png` (se agrega cuando existan los dos despliegues).

## 13. Fallo de la nueva imagen con el esquema ya modificado

*Responsable: Mariana.* Pendiente.

## 14. Recursos que pueden seguir generando costo tras detener una VM

*Responsable: Paula.* Pendiente: se completa con la revisión de costos real de cada nube (evidencias `azure-11-apagado.png` y `aws-11-apagado.png`).

## 15. Dificultad técnica real y cómo se diagnosticó

*Responsable: Mariana.* Pendiente.
