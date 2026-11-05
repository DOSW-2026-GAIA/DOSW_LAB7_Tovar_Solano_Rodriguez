# DOSW_LAB7_Tovar_Solano_Rodriguez

# ToDo Full Stack

Laboratorio 7 · Seguridad
Escuela Colombiana de Ingeniería Julio Garavito
Docente: Rodrigo Gualtero

Aplicación web para gestionar tareas personales. Permite crear, consultar, editar, cambiar de estado y eliminar tareas desde una interfaz en React que consume una API REST en Spring Boot, con persistencia en PostgreSQL ejecutado en Docker.

## Integrantes del equipo

| Nombre | Correo institucional | Usuario de GitHub |
|---|---|---|
| Mariana Tovar | mariana.tovar-c@mail.escuelaing.edu.co | marix201 |
| Paula Andrea Solano Morales | paula.solano-m@mail.escuelaing.edu.co | AndreaSolano23 |
| Natalia Andrea Rodríguez Torres | natalia.rodriguez-t@mail.escuelaing.edu.co | nataliaRT12 |

**Links repositorios personales**

| Nombre | Link |
|---|---|
| Mariana Tovar Cardozo | https://github.com/Marix201/DOSW_Lab7_Tovar.git |
| Paula Andrea Solano Morales |https://github.com/AndreaSolano23/DOSW_Lab6_Solano.git |
| Natalia Andrea Rodríguez Torres | https://github.com/nataliaRT12/DOSW_LAB6_Rodriguez/tree/main |

**Laboratorio de seguridad (JWT)**

- Video de demostración: https://youtu.be/TxYtSOzQRq0
- Informe de seguridad: [docs/informe-seguridad-jwt.md](docs/informe-seguridad-jwt.md)

**Laboratorio anterior (CRUD)**

- Video de demostración: https://youtu.be/6RhqSoNWYNY?si=JfLxBJZMiZ0GHhpQ
- Informe del laboratorio: [docs/informe-laboratorio.md](docs/informe-laboratorio.md)

## Laboratorio de extensión · Seguridad con Spring Security y JWT

Enunciado: [AppToDo_Security](https://github.com/DOSW-2026-2/AppToDo_Security/blob/main/README.md)  
Rama de trabajo: `feature/jwt-security`  
Tablero de Jira (épica de seguridad): https://parcialdosw.atlassian.net/jira/software/projects/AE/boards/70/timeline

### Estado inicial

Antes de empezar se verificó que el proyecto del laboratorio anterior funcionara completo: PostgreSQL en Docker, la API en Spring Boot y el frontend en React.

- La API expone el CRUD de tareas en `/api/v1/tasks` y el de categorías en `/api/v1/categories`.
- No existe el concepto de usuario: cualquier persona que conozca la URL puede listar, crear, editar o eliminar **todas** las tareas, sin enviar credenciales.
- El frontend muestra directamente la lista de tareas, sin inicio de sesión.
- La base de datos tiene las tablas `tasks` y `categories` (scripts `001` y `002`).

![Estado inicial del CRUD](docs/evidence/security/00-estado-inicial-crud.png)

![API sin autenticación](docs/evidence/security/00-api-sin-token.png)

### Alcance de los cambios

Se convierte ToDo en una aplicación con cuentas de usuario y tareas privadas:

- Registro de usuarios (nombre, correo y contraseña) e inicio de sesión con correo y contraseña.
- Contraseñas almacenadas con BCrypt.
- Emisión de un JWT firmado (HS256) con duración de 30 minutos y validación en cada petición protegida.
- Cada usuario solo puede consultar, crear, editar y eliminar sus propias tareas.
- Endpoint administrativo `/api/v1/admin/summary` solo para el rol `ADMIN`.
- Frontend con registro, inicio de sesión, cierre de sesión y token guardado en memoria.
- Pruebas automatizadas de los flujos correctos y de los intentos de acceso indebido.

Fuera del alcance: despliegue en la nube, CI/CD, login con Google, refresh tokens, MFA y recuperación de contraseña.

### Planeación en Jira

Tablero: https://parcialdosw.atlassian.net/jira/software/projects/AE/boards/70/timeline

El trabajo se organizó en la épica AE-9, "Seguridad: cuentas de usuario y tareas privadas con JWT", dividida en seis features: gestión de cuentas (AE-10), protección de la API (AE-11), tareas privadas (AE-12), roles (AE-13), sesión en React (AE-14) y documentación y entrega (AE-15). Cada feature agrupa sus historias de usuario (HU-SEG-01 a HU-SEG-07), escritas con el formato "Como… quiero… para…" y con criterios de aceptación en Gherkin, y cada historia tiene sus tareas de implementación y de pruebas.

![Épica de seguridad en Jira](docs/evidence/security/16-jira-epica.png)

![Features de la épica en el backlog](docs/evidence/security/17-jira-backlog.png)

![Historia HU-SEG-03 con sus criterios de aceptación](docs/evidence/security/18-jira-historia.png)

![Feature F3 con su descripción y su historia](docs/evidence/security/19-jira-feature.png)

### Componentes que se modifican

| Capa | Componente | Cambio |
| --- | --- | --- |
| Base de datos | `users` | Nueva tabla (`003_add_users_security.sql`) |
| Base de datos | `tasks` | Nueva llave foránea `user_id` hacia `users` |
| Backend | `UserEntity`, `UserRole`, `UserRepository` | Nuevos |
| Backend | `SecurityConfig` (`SecurityFilterChain`, `PasswordEncoder`, `JwtEncoder`, `JwtDecoder`) | Nuevo |
| Backend | `TokenService` | Nuevo: genera el JWT |
| Backend | `AuthService`, `AuthController` | Nuevos: registro y login |
| Backend | `UserController` (`/users/me`), `AdminController` (`/admin/summary`) | Nuevos |
| Backend | `TaskEntity`, `TaskRepository`, `TaskService`, `TaskController` | Modificados: filtran por el usuario autenticado |
| Backend | `GlobalExceptionHandler` | Modificado: errores 401, 403 y 409 |
| Frontend | `AuthContext`, `LoginForm`, `RegisterForm`, `authApi.js` | Nuevos |
| Frontend | `taskApi.js`, `useTasks`, `TasksPage`, `App.jsx` | Modificados: envían el token y manejan la sesión |

```mermaid
flowchart LR
    subgraph front["React"]
        Auth["AuthContext / LoginForm / RegisterForm"]:::nuevo
        Tasks["TasksPage / useTasks / taskApi"]:::modificado
    end
    subgraph api["API Spring Boot"]
        Sec["SecurityFilterChain + JwtDecoder"]:::nuevo
        AuthC["AuthController"]:::nuevo
        AuthS["AuthService + TokenService"]:::nuevo
        UserC["UserController / AdminController"]:::nuevo
        TaskC["TaskController"]:::modificado
        TaskS["TaskService"]:::modificado
        UserR["UserRepository"]:::nuevo
        TaskR["TaskRepository"]:::modificado
    end
    DB[("PostgreSQL: users, tasks")]:::modificado

    Auth -->|login / register| AuthC
    Tasks -->|Bearer JWT| Sec
    Sec --> TaskC
    Sec --> UserC
    AuthC --> AuthS --> UserR
    TaskC --> TaskS --> TaskR
    UserR --> DB
    TaskR --> DB

    classDef nuevo fill:#d4f4dd,stroke:#2e7d32,color:#000
    classDef modificado fill:#fff3cd,stroke:#b8860b,color:#000
```

Verde: componente nuevo. Amarillo: componente existente que se modifica.

### Migración de la base de datos

El script [`database/003_add_users_security.sql`](database/003_add_users_security.sql) crea la tabla `users` y agrega a `tasks` la columna `user_id` con su llave foránea. Para no borrar las tareas que ya existían:

1. Se crea el usuario `legacy@todo.local` ("Tareas anteriores").
2. Se agrega `user_id` permitiendo nulos y se asignan a ese usuario todas las tareas existentes.
3. Solo después se aplica `NOT NULL`, la llave foránea y un índice sobre `user_id`.

Todo se ejecuta en una transacción. El usuario `legacy` tiene como hash el valor `LOCKED`, que no corresponde a un hash BCrypt, por lo que nadie puede iniciar sesión con esa cuenta.

```
Get-Content database/003_add_users_security.sql | docker exec -i todo-postgres psql -U todo_user -d todo_db
```

![Migración 003 aplicada](docs/evidence/security/01-migracion-003.png)

### Cuenta ADMIN para desarrollo local

El registro público siempre crea usuarios con rol `USER` y no acepta el campo `role`. Para probar `/api/v1/admin/summary` en local se registra una cuenta normal desde la aplicación y luego se promueve directamente en la base de datos con el script [`database/dev/promote_admin.sql`](database/dev/promote_admin.sql):

```
Get-Content database/dev/promote_admin.sql | docker exec -i todo-postgres psql -U todo_user -d todo_db -v email=admin@todo.local
```

El rol viaja dentro del JWT, así que después de promover la cuenta hay que iniciar sesión de nuevo para obtener un token con rol `ADMIN`. Este script es solo para desarrollo; no se publican contraseñas reales.

### Diagramas de la solución

Los diagramas corresponden a la implementación final de la rama `feature/jwt-security`.

#### C4 · Nivel 1 · Contexto

![Diagrama de contexto](docs/diagrams/c4-contexto.png)

#### C4 · Nivel 2 · Contenedores

```mermaid
flowchart TB
    user["Usuario / Administrador<br/>[Persona]"]

    subgraph todo["Sistema ToDo"]
        spa["Aplicación web<br/>[React + Vite]<br/>Registro, login, tareas y cierre de sesión.<br/>Guarda el JWT en memoria"]
        api["API REST<br/>[Spring Boot + Spring Security]<br/>Emite y valida JWT, aplica roles<br/>y propiedad de las tareas"]
        db[("Base de datos<br/>[PostgreSQL 17 en Docker]<br/>users, tasks, categories")]
    end

    user -->|"HTTP"| spa
    spa -->|"JSON / HTTP<br/>Authorization: Bearer JWT"| api
    api -->|"JDBC / JPA"| db

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef container fill:#438dd5,color:#fff,stroke:#2e6295
    class user person
    class spa,api,db container
```

#### C4 · Nivel 3 · Componentes del back-end

```mermaid
flowchart TB
    spa["Aplicación web React"]

    subgraph api["API REST · Spring Boot"]
        chain["SecurityFilterChain<br/>+ JwtDecoder<br/>Valida el Bearer token"]
        errors["SecurityErrorHandler<br/>401 / 403 en JSON"]
        authC["AuthController<br/>/auth/register, /auth/login"]
        userC["UserController<br/>/users/me"]
        taskC["TaskController<br/>/tasks"]
        catC["CategoryController<br/>/categories"]
        adminC["AdminController<br/>/admin/summary"]
        authS["AuthService<br/>Registro y login con BCrypt"]
        token["TokenService<br/>JwtEncoder HS256"]
        userS["UserService"]
        taskS["TaskService<br/>Filtra por propietario"]
        catS["CategoryService"]
        adminS["AdminService<br/>Métricas agregadas"]
        userR["UserRepository"]
        taskR["TaskRepository"]
        catR["CategoryRepository"]
        handler["GlobalExceptionHandler<br/>400 / 401 / 404 / 409"]
    end

    db[("PostgreSQL")]

    spa -->|"JSON + Bearer"| chain
    chain -.-> errors
    chain --> authC & userC & taskC & catC & adminC
    authC --> authS
    authS --> token
    authS --> userR
    userC --> userS --> userR
    taskC --> taskS --> taskR
    taskS --> userR
    catC --> catS --> catR
    adminC --> adminS
    adminS --> userR & taskR
    userR & taskR & catR --> db
    authC & userC & taskC & catC & adminC -.-> handler
```

#### C4 · Nivel 3 · Componentes del front-end

```mermaid
flowchart TB
    subgraph spa["Aplicación web · React"]
        main["main.jsx<br/>AuthProvider"]
        ctx["AuthContext<br/>token y usuario en memoria,<br/>login, register, logout, expireSession"]
        app["App<br/>Muestra AuthPage o TasksPage"]
        authPage["AuthPage"]
        login["LoginForm"]
        register["RegisterForm"]
        tasksPage["TasksPage<br/>Usuario y Sign out"]
        hook["useTasks<br/>Si recibe 401, expira la sesión"]
        comps["TaskForm / TaskList / TaskItem"]
        authApi["authApi.js<br/>register, login, getProfile"]
        taskApi["taskApi.js<br/>CRUD con Bearer token"]
        http["http.js<br/>API_URL, authHeaders, ApiError"]
    end

    api["API REST Spring Boot"]

    main --> ctx
    main --> app
    app --> authPage & tasksPage
    authPage --> login & register
    login & register --> ctx
    ctx --> authApi
    tasksPage --> hook & comps
    hook --> ctx
    hook --> taskApi
    authApi & taskApi --> http
    http -->|"fetch JSON"| api
```

#### Diagrama de clases (back-end)

```mermaid
classDiagram
    direction LR

    class UserEntity {
        Long id
        String name
        String email
        String passwordHash
        UserRole role
        LocalDateTime createdAt
    }
    class TaskEntity {
        Long id
        String title
        String description
        TaskStatus status
        TaskPriority priority
        LocalDate dueDate
        LocalDateTime createdAt
        UserEntity owner
    }
    class UserRole {
        <<enumeration>>
        USER
        ADMIN
    }
    class UserRepository {
        <<interface>>
        findByEmail(email) Optional~UserEntity~
        existsByEmail(email) boolean
    }
    class TaskRepository {
        <<interface>>
        findAllByOwnerId(ownerId) List~TaskEntity~
        findByIdAndOwnerId(id, ownerId) Optional~TaskEntity~
        countByStatus(status) long
    }
    class AuthService {
        <<interface>>
        register(RegisterRequest) UserResponse
        login(LoginRequest) LoginResponse
    }
    class TaskService {
        <<interface>>
        findAll(ownerId) List~TaskResponse~
        findById(id, ownerId) TaskResponse
        create(request, ownerId) TaskResponse
        update(id, request, ownerId) TaskResponse
        delete(id, ownerId)
    }
    class UserService {
        <<interface>>
        findById(id) UserResponse
    }
    class AdminService {
        <<interface>>
        summary() AdminSummaryResponse
    }
    class TokenService {
        issue(UserEntity) String
        getExpirationSeconds() long
    }
    class SecurityConfig {
        securityFilterChain(HttpSecurity) SecurityFilterChain
        passwordEncoder() PasswordEncoder
        jwtSigningKey(secret) SecretKey
        jwtEncoder(key) JwtEncoder
        jwtDecoder(key, issuer) JwtDecoder
    }
    class SecurityErrorHandler {
        commence() 401
        handle() 403
    }
    class AuthController
    class UserController
    class TaskController
    class AdminController
    class GlobalExceptionHandler

    UserEntity "1" <-- "*" TaskEntity : owner
    UserEntity --> UserRole
    UserRepository ..> UserEntity
    TaskRepository ..> TaskEntity
    AuthService <|.. AuthServiceImpl
    TaskService <|.. TaskServiceImpl
    UserService <|.. UserServiceImpl
    AdminService <|.. AdminServiceImpl
    AuthServiceImpl --> UserRepository
    AuthServiceImpl --> TokenService
    TaskServiceImpl --> TaskRepository
    TaskServiceImpl --> UserRepository
    UserServiceImpl --> UserRepository
    AdminServiceImpl --> UserRepository
    AdminServiceImpl --> TaskRepository
    AuthController --> AuthService
    UserController --> UserService
    TaskController --> TaskService
    AdminController --> AdminService
    SecurityConfig --> SecurityErrorHandler
    TokenService ..> UserEntity
```

DTOs: `RegisterRequest`, `LoginRequest`, `LoginResponse`, `UserResponse`, `AdminSummaryResponse`, `TaskCreateRequest`, `TaskUpdateRequest`, `TaskResponse`. Excepciones: `EmailAlreadyRegisteredException` (409), `InvalidCredentialsException` (401), `TaskNotFoundException` y `UserNotFoundException` (404), manejadas en `GlobalExceptionHandler`.

#### Modelo entidad-relación

```mermaid
erDiagram
    USERS ||--o{ TASKS : "es propietario de"
    CATEGORIES |o--o{ TASKS : "clasifica"

    USERS {
        BIGSERIAL id PK
        VARCHAR_100 name "NOT NULL"
        VARCHAR_255 email "NOT NULL, UNIQUE, en minúsculas"
        VARCHAR_100 password_hash "NOT NULL, BCrypt"
        VARCHAR_20 role "USER o ADMIN, por defecto USER"
        TIMESTAMP created_at "NOT NULL"
    }
    TASKS {
        BIGSERIAL id PK
        VARCHAR_120 title "NOT NULL"
        VARCHAR_500 description
        VARCHAR_20 status "PENDING, IN_PROGRESS, COMPLETED"
        VARCHAR_10 priority "LOW, MEDIUM, HIGH"
        DATE due_date
        TIMESTAMP created_at "NOT NULL"
        BIGINT category_id FK "NULL"
        BIGINT user_id FK "NOT NULL, indexado"
    }
    CATEGORIES {
        BIGSERIAL id PK
        VARCHAR_40 name "NOT NULL, UNIQUE"
        VARCHAR_10 color "BLUE, GREEN, ORANGE, PURPLE"
    }
```

Un usuario tiene muchas tareas y cada tarea pertenece a exactamente un usuario (`user_id NOT NULL`, `ON DELETE CASCADE`). La relación con `categories` viene del requisito anterior y es opcional.

### Contrato de endpoints

Base: `http://localhost:8080/api/v1`. Las rutas autenticadas requieren la cabecera `Authorization: Bearer <JWT>`.

| Método | Endpoint | Acceso | Respuestas |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Público | `201`, `400`, `409` |
| `POST` | `/auth/login` | Público | `200` con JWT, `400`, `401` |
| `GET` | `/users/me` | Autenticado | `200`, `401` |
| `GET` | `/tasks` | Autenticado | `200` (solo tareas propias), `401` |
| `GET` | `/tasks/{id}` | Autenticado | `200`, `401`, `404` (inexistente o ajena) |
| `POST` | `/tasks` | Autenticado | `201` (propietario = usuario del token), `400`, `401` |
| `PUT` | `/tasks/{id}` | Autenticado | `200`, `400`, `401`, `404` (inexistente o ajena) |
| `DELETE` | `/tasks/{id}` | Autenticado | `204`, `401`, `404` (inexistente o ajena) |
| `GET` | `/categories`, `/categories/{id}` | Autenticado | `200`, `401`, `404` |
| `POST`, `PUT` | `/categories`, `/categories/{id}` | Autenticado | `201`/`200`, `400`, `401`, `404` |
| `GET` | `/admin/summary` | `ADMIN` | `200`, `401`, `403` |

Las categorías son un catálogo compartido del requisito anterior: exigen autenticación, pero no tienen propietario.

**Registro**

```
POST /api/v1/auth/register
Content-Type: application/json

{ "name": "Ana Pérez", "email": "ana@example.com", "password": "ContrasenaDemo123!" }
```

```
201 Created
{ "id": 1, "name": "Ana Pérez", "email": "ana@example.com", "role": "USER" }
```

**Inicio de sesión**

```
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "ana@example.com", "password": "ContrasenaDemo123!" }
```

```
200 OK
{ "tokenType": "Bearer", "accessToken": "<JWT_FIRMADO>", "expiresIn": 1800 }
```

**Resumen administrativo**

```
GET /api/v1/admin/summary
Authorization: Bearer <JWT_DE_ADMIN>
```

```
200 OK
{ "totalUsers": 4, "totalTasks": 5, "tasksByStatus": { "PENDING": 5, "IN_PROGRESS": 0, "COMPLETED": 0 } }
```

**Política de errores.** Todas las respuestas de error tienen el formato `{ "status": ..., "message": ... }`.

| Situación | Código |
| --- | --- |
| Datos inválidos en registro, login o tareas | `400 Bad Request` |
| Registro con correo ya existente | `409 Conflict` |
| Login inválido | `401 Unauthorized` |
| Falta de token, token expirado, alterado o de otro emisor | `401 Unauthorized` |
| JWT válido sin el rol requerido | `403 Forbidden` |
| Tarea inexistente o perteneciente a otro usuario | `404 Not Found` |

### Flujo de autenticación JWT

**Inicio de sesión**

```mermaid
sequenceDiagram
    actor U as Usuario
    participant R as React (AuthContext)
    participant A as AuthController
    participant S as AuthService
    participant DB as PostgreSQL
    participant T as TokenService (JwtEncoder)

    U->>R: Correo y contraseña
    R->>A: POST /api/v1/auth/login
    A->>S: login(request)
    S->>DB: findByEmail(correo normalizado)
    DB-->>S: Usuario con password_hash
    S->>S: PasswordEncoder.matches (BCrypt)
    alt Credenciales inválidas
        S-->>A: InvalidCredentialsException
        A-->>R: 401 Unauthorized
    else Credenciales válidas
        S->>T: issue(usuario)
        T-->>S: JWT HS256 (sub, iss, iat, exp, roles)
        S-->>A: tokenType, accessToken, expiresIn
        A-->>R: 200 OK + JWT
        R->>A: GET /api/v1/users/me (Bearer)
        A-->>R: Perfil del usuario
        R->>R: Guarda token y usuario en memoria
        R-->>U: Vista de tareas
    end
```

**Petición protegida**

```mermaid
sequenceDiagram
    participant R as React (taskApi)
    participant F as SecurityFilterChain
    participant D as JwtDecoder
    participant C as TaskController
    participant S as TaskService
    participant DB as PostgreSQL

    R->>F: GET /api/v1/tasks + Authorization: Bearer JWT
    F->>D: decode(token)
    D->>D: Verifica firma HS256, exp, iss y sub
    alt Token ausente, alterado o vencido
        F-->>R: 401 Unauthorized (JSON)
        R->>R: Limpia la sesión y muestra el login
    else Token válido
        D-->>F: Jwt + autoridades ROLE_*
        F->>C: Petición autenticada
        C->>S: findAll(id del sub)
        S->>DB: findAllByOwnerId(id)
        DB-->>S: Tareas del usuario
        S-->>C: Lista de TaskResponse
        C-->>R: 200 OK
    end
```

### Decisiones de seguridad

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Firma del JWT | HS256 con una llave simétrica. `NimbusJwtEncoder` y `NimbusJwtDecoder` usan el mismo `SecretKey`. | El backend emite y valida sus propios tokens; no hay terceros que necesiten una llave pública. |
| Llave de firma | Se lee de `JWT_SECRET` (variable de entorno o `backend/.env`, ignorado por Git). Si tiene menos de 32 bytes la aplicación no arranca. | No hay secretos en el repositorio y se evita una llave débil para HMAC-SHA256. |
| Contenido del token | `sub` (id del usuario), `iss` (`todo-api`), `iat`, `exp`, `email` y `roles`. | `sub` usa el id porque no cambia; los roles se convierten en autoridades `ROLE_USER` / `ROLE_ADMIN`. |
| Validación | En cada petición se verifican la firma, `exp`, `iss` y que exista `sub`. | Decodificar el token no basta: un JWT alterado o de otro emisor debe rechazarse. |
| Duración | 30 minutos, sin refresh token. | Requisito del laboratorio; al vencer el usuario vuelve a iniciar sesión. |
| Sesión | `SessionCreationPolicy.STATELESS`, CSRF deshabilitado. | La API no usa cookies ni sesión de servidor; la identidad viaja solo en la cabecera `Authorization`. |
| Almacenamiento en el frontend | El token y el usuario se guardan en el estado de React (`AuthContext`), no en `localStorage`. | Un script inyectado no encuentra el token persistido en el navegador. Como consecuencia, al recargar la página se pierde la sesión. |
| Cierre de sesión | Solo en el cliente: se borra el token del estado y se desmonta la vista de tareas. | El JWT no se revoca en el servidor; si alguien lo copió, sigue siendo válido hasta que expire. En un sistema real se usaría una lista de revocación o tokens cortos con refresh token. |
| Contraseñas | BCrypt (`BCryptPasswordEncoder`), entre 8 y 72 caracteres. | Hash lento y con sal; 72 es el límite que procesa BCrypt. Nunca se devuelve la contraseña ni su hash. |
| Registro | El rol siempre es `USER`; el campo `role` enviado por el cliente se ignora. El correo se normaliza a minúsculas. | Ninguna petición pública puede elevar privilegios ni crear cuentas duplicadas con mayúsculas. |
| Rol `ADMIN` | Solo se asigna con el script de desarrollo `database/dev/promote_admin.sql`. `/api/v1/admin/**` exige `hasRole("ADMIN")`. | La autorización por rol se hace en el backend, por URL. |
| Propiedad de las tareas | El propietario se toma del `sub` del token y las consultas filtran por `id` y `owner`. | El cliente no puede elegir el dueño; una tarea ajena responde `404` para no revelar que existe. |
| CORS | Solo se permite el origen `http://localhost:5173`, con los métodos `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` y la cabecera `Authorization`. | El frontend local puede llamar a la API; otros orígenes no. |
| Errores | `401` y `403` se responden en JSON con el mismo formato que el resto de la API (`SecurityErrorHandler`). | El frontend distingue sesión vencida (`401`) de falta de permisos (`403`). |
| Logs | No se registran tokens, contraseñas ni la cabecera `Authorization`. | Evita filtrar credenciales en los registros. |

### Pruebas de seguridad

Back-end (desde `backend`, no necesita Docker: las pruebas que levantan la aplicación completa usan H2 en memoria con el perfil `test`):

```
mvn clean verify
```

Front-end (desde `frontend`):

```
npm test
```

| Tipo | Clases | Pruebas |
| --- | --- | --- |
| Unitarias (Mockito) | `AuthServiceTest`, `TaskServiceTest`, `AdminServiceTest`, `TokenServiceTest`, `CategoryServiceTest` | 34 |
| Controladores con Spring Security (MockMvc) | `AuthControllerTest`, `TaskControllerTest`, `UserControllerTest`, `AdminControllerTest`, `CategoryControllerTest` | 33 |
| Repositorio (JPA) | `TaskRepositoryTest` | 5 |
| Integración HTTP + seguridad + persistencia | `SecurityIntegrationTest`, `TodoApiApplicationTests` | 17 |
| Front-end (Vitest + Testing Library) | `App.test`, `LoginForm.test`, `RegisterForm.test`, `TasksPage.test`, `taskApi.test`, `authApi.test`, `TaskForm.test`, `TaskList.test` | 34 |

Total: 89 pruebas en el back-end y 34 en el front-end.

#### Matriz de pruebas

| ID | Prueba | Resultado esperado | Dónde se verifica |
| --- | --- | --- | --- |
| PT-01 | Registrar usuario válido | `201`, rol `USER` | `SecurityIntegrationTest.pt01_pt03…`, `AuthControllerTest`, `AuthServiceTest` |
| PT-02 | Correo duplicado | `409`, sin duplicados | `SecurityIntegrationTest.pt02…`, `AuthControllerTest`, `AuthServiceTest` |
| PT-03 | Guardar contraseña | Hash BCrypt, no texto plano | `SecurityIntegrationTest.pt01_pt03…`, `AuthServiceTest` |
| PT-04 | Login correcto | `200` con token firmado | `SecurityIntegrationTest.pt04…`, `AuthControllerTest`, `TokenServiceTest` |
| PT-05 | Login incorrecto | `401` sin token | `SecurityIntegrationTest.pt05…`, `AuthServiceTest`, `AuthControllerTest` |
| PT-06 | Tareas sin token | `401` | `SecurityIntegrationTest.pt06…`, `TaskControllerTest` |
| PT-07 | Tareas con token válido | `200`, solo las propias | `SecurityIntegrationTest.pt07…`, `TaskRepositoryTest`, `TaskServiceTest` |
| PT-08 | Token modificado | `401` | `SecurityIntegrationTest.pt08…`, `TokenServiceTest` |
| PT-09 | Token expirado | `401` | `SecurityIntegrationTest.pt09…`, `TokenServiceTest` |
| PT-10 | Consultar tarea ajena | `404` sin datos | `SecurityIntegrationTest.pt10…`, `TaskServiceTest`, `TaskRepositoryTest` |
| PT-11 | Modificar tarea ajena | `404`, sin cambios en BD | `SecurityIntegrationTest.pt11…`, `TaskServiceTest` |
| PT-12 | Eliminar tarea ajena | `404`, sin cambios en BD | `SecurityIntegrationTest.pt12…`, `TaskServiceTest` |
| PT-13 | Crear tarea autenticada | Propietario = usuario del token | `SecurityIntegrationTest.pt13…`, `TaskServiceTest` |
| PT-14 | `USER` en `/admin/summary` | `403` | `SecurityIntegrationTest.pt14…`, `AdminControllerTest` |
| PT-15 | `ADMIN` en `/admin/summary` | `200` | `SecurityIntegrationTest.pt15…`, `AdminControllerTest` |
| PT-16 | Cerrar sesión en React | Token y tareas desaparecen de la UI | `App.test` (PT-16), `TasksPage.test` |
| PT-17 | Respuesta `401` en React | Vuelve al inicio de sesión | `App.test` (PT-17), `TasksPage.test` |
| PT-18 | Otro usuario inicia sesión | Solo ve sus tareas | `App.test` (PT-18) |

#### Cobertura (JaCoCo)

Reporte en `backend/target/site/jacoco/index.html` después de `mvn clean verify`.

| Métrica | Cobertura |
| --- | --- |
| Instrucciones | 95,3 % |
| Ramas | 87,5 % |
| Líneas | 91,5 % |
| Paquete `security` | 100 % de instrucciones |

Al iniciar este laboratorio el módulo de categorías del requisito anterior no tenía pruebas; se agregaron `CategoryServiceTest` y `CategoryControllerTest` para mantener la cobertura por encima del 80 %. La cobertura no reemplaza los escenarios de seguridad: estos se validan explícitamente en la matriz anterior.

![Pruebas del back-end](docs/evidence/security/07-backend-tests.png)

![Pruebas del front-end](docs/evidence/security/08-frontend-tests.png)

![Reporte JaCoCo](docs/evidence/security/09-jacoco.png)

### Verificación manual de punta a punta

Recorrido realizado con PostgreSQL en Docker, la API en Spring Boot y el frontend en React, todo en local.

**1. Registro e inicio de sesión de Ana y Luis.** Cada uno ve únicamente sus tareas.

![Inicio de sesión](docs/evidence/security/02-react-login.png)

![Tareas de Ana](docs/evidence/security/03-react-tareas-ana.png)

![Tareas de Luis](docs/evidence/security/04-react-tareas-luis.png)

**2. Contraseñas almacenadas con BCrypt.** La cuenta `legacy` tiene `LOCKED`, que no es un hash válido.

![Hash de contraseñas](docs/evidence/security/06-bd-password-hash.png)

**3. Luis intenta modificar, eliminar y consultar la tarea 4 de Ana usando su propio JWT.** El servidor responde `404` en los tres casos y la tarea de Ana permanece igual.

![Luis contra la tarea de Ana](docs/evidence/security/10-luis-tarea-ana.png)

**4. Ruta protegida sin token y con un token alterado.** Ambas responden `401`.

![Sin token y token alterado](docs/evidence/security/11-sin-token-y-alterado.png)

**5. `/api/v1/admin/summary` con `USER` y con `ADMIN`.** Ana (`USER`) recibe `403`; la cuenta de administrador se registra como `USER`, se promueve con el script de desarrollo y, tras iniciar sesión de nuevo, recibe `200` con las métricas agregadas.

![Admin con USER](docs/evidence/security/12-admin-como-user.png)

![Promoción a ADMIN](docs/evidence/security/13-promover-admin.png)

![Admin con ADMIN](docs/evidence/security/14-admin-como-admin.png)

**6. Propietarios en PostgreSQL.** Cada tarea está relacionada con su usuario y la tarea de Ana sigue sin cambios después del intento de Luis.

![Tareas por usuario](docs/evidence/security/05-bd-tareas-por-usuario.png)

![Base de datos después del intento](docs/evidence/security/15-bd-despues-del-ataque.png)

**7. Pruebas automatizadas.** Ver la sección anterior: 89 pruebas en el back-end y 34 en el front-end.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Front-end | React + Vite, Vitest, React Testing Library |
| Back-end | Java 21, Spring Boot 4, Maven, Spring Data JPA, Bean Validation |
| Seguridad | Spring Security, OAuth2 Resource Server (JWT con Nimbus, HS256), BCrypt |
| Base de datos | PostgreSQL 17 (imagen oficial `postgres:17-alpine` en Docker) |
| Pruebas back-end | JUnit 5, Mockito, AssertJ, MockMvc, Spring Security Test, H2 (perfil `test`) |
| Cobertura | JaCoCo |

## Arquitectura

```
React (AuthContext, formularios, hooks, authApi.js, taskApi.js)
        │  HTTP + JSON + Authorization: Bearer JWT
        ▼
SecurityFilterChain (valida el JWT)
        │
        ▼
REST Controller  →  Service  →  Repository  →  Entity JPA
                                                    │
                                                    ▼
                                              PostgreSQL (Docker)
```

- **Seguridad:** `SecurityConfig` define las rutas públicas, el rol `ADMIN` y la validación del JWT; `TokenService` emite los tokens y `SecurityErrorHandler` responde 401/403 en JSON.
- **Controller:** expone `/auth`, `/users`, `/tasks`, `/categories` y `/admin`; valida la entrada con `@Valid` y obtiene la identidad del usuario del `Jwt` autenticado.
- **Service:** contiene la lógica de negocio (registro con BCrypt, login, tareas filtradas por propietario, métricas administrativas, conversión Entity ↔ DTO).
- **Repository:** acceso a datos con `JpaRepository`; las consultas de tareas filtran por `id` y propietario.
- **Entity / DTO:** `UserEntity` y `TaskEntity` se mapean a `users` y `tasks`; los DTOs definen lo que entra y sale de la API, sin exponer el hash de la contraseña.
- **Manejo de errores:** `GlobalExceptionHandler` convierte las excepciones en respuestas 400, 401, 404 y 409 con formato `{ "status": ..., "message": ... }`.

## Estructura del repositorio

```
DOSW_LAB7_Tovar_Solano_Rodriguez/
├── backend/                API Spring Boot
│   ├── .env.example        Variables necesarias (sin valores)
│   └── src/main/java/edu/eci/dosw/todo/
│       ├── controller/     Auth, User, Task, Category, Admin
│       ├── security/       SecurityConfig, TokenService, SecurityErrorHandler
│       ├── service/        Lógica de negocio
│       ├── repository/     Spring Data JPA
│       ├── entity/         UserEntity, TaskEntity, enums
│       ├── dto/            Peticiones y respuestas
│       └── exception/      Excepciones y GlobalExceptionHandler
├── frontend/               Aplicación React + Vite
│   └── src/
│       ├── api/            http.js, authApi.js, taskApi.js
│       └── features/
│           ├── auth/       AuthContext, LoginForm, RegisterForm, AuthPage
│           └── tasks/      TasksPage, useTasks, componentes de tareas
├── database/
│   ├── 001_create_schema.sql
│   ├── 002_add_categories.sql
│   ├── 003_add_users_security.sql
│   └── dev/promote_admin.sql   Solo para desarrollo local
└── docs/
    ├── evidence/           Capturas de evidencia (security/ para este laboratorio)
    ├── informe-laboratorio.md
    └── informe-seguridad-jwt.md
```

## Modelo de datos

El diagrama entidad-relación está en la sección [Diagramas de la solución](#diagramas-de-la-solución).

**Usuario (`users`)**

| Campo | Tipo | Obligatorio | Valor por defecto |
| --- | --- | --- | --- |
| `id` | Long | Sí | Generado |
| `name` | String (máx. 100) | Sí | |
| `email` | String (máx. 255, único, en minúsculas) | Sí | |
| `passwordHash` | String (hash BCrypt) | Sí | |
| `role` | `USER`, `ADMIN` | Sí | `USER` |
| `createdAt` | LocalDateTime | Sí | Fecha y hora actual |

**Tarea (`tasks`)**

| Campo | Tipo | Obligatorio | Valor por defecto |
| --- | --- | --- | --- |
| `id` | Long | Sí | Generado |
| `title` | String (máx. 120) | Sí | |
| `description` | String (máx. 500) | No | |
| `status` | `PENDING`, `IN_PROGRESS`, `COMPLETED` | Sí | `PENDING` |
| `priority` | `LOW`, `MEDIUM`, `HIGH` | Sí | `MEDIUM` |
| `dueDate` | LocalDate | No | |
| `createdAt` | LocalDateTime | Sí | Fecha y hora actual |
| `owner` (`user_id`) | Usuario propietario | Sí | Usuario del token |

## Requisitos previos

- Docker Desktop
- Java 21
- Maven (o el wrapper `mvnw` incluido)
- Node.js y npm

## Cómo ejecutar el proyecto

Se necesitan tres terminales.

### 1. Base de datos (primera vez)

```
docker pull postgres:17-alpine
docker volume create todo-postgres-data
docker run -d --name todo-postgres -e POSTGRES_DB=todo_db -e POSTGRES_USER=todo_user -e POSTGRES_PASSWORD=todo_password -p 5432:5432 -v todo-postgres-data:/var/lib/postgresql/data postgres:17-alpine
Get-Content database/001_create_schema.sql | docker exec -i todo-postgres psql -U todo_user -d todo_db
Get-Content database/002_add_categories.sql | docker exec -i todo-postgres psql -U todo_user -d todo_db
Get-Content database/003_add_users_security.sql | docker exec -i todo-postgres psql -U todo_user -d todo_db
```

Si el contenedor ya existe, basta con iniciarlo. Si viene del laboratorio anterior, se aplican solo los scripts que falten (`002` y `003`); el `003` conserva las tareas existentes asignándolas al usuario `legacy@todo.local`.

```
docker start todo-postgres
```

### 2. Back-end

La llave de firma del JWT no está en el repositorio. Se configura una sola vez en el archivo `backend/.env`, que Git ignora (ver [`backend/.env.example`](backend/.env.example)). Para generar una llave aleatoria desde PowerShell:

```
cd backend
"JWT_SECRET=$([Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 })))" | Out-File -Encoding ascii .env
```

Luego se inicia la API:

```
mvn spring-boot:run
```

La API queda disponible en `http://localhost:8080`.

| Variable | Obligatoria | Uso | Valor por defecto |
| --- | --- | --- | --- |
| `JWT_SECRET` | Sí | Llave HMAC para firmar y validar los JWT (mínimo 32 bytes) | Ninguno: sin ella la aplicación no arranca |
| `DB_URL` | No | URL JDBC de PostgreSQL | `jdbc:postgresql://localhost:5432/todo_db` |
| `DB_USER` | No | Usuario de la base de datos | `todo_user` |
| `DB_PASSWORD` | No | Contraseña de la base de datos | `todo_password` (solo para el contenedor local) |

Las variables pueden definirse en `backend/.env` o como variables de entorno del sistema.

### 3. Front-end

```
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. Consume la API en `http://localhost:8080/api/v1`; para usar otra URL se define `VITE_API_URL` (por ejemplo, en `frontend/.env.local`).

El token se guarda solo en memoria, así que al recargar la página hay que iniciar sesión de nuevo.

## API REST

El contrato completo, con el nivel de acceso de cada endpoint y la política de errores, está en [Contrato de endpoints](#contrato-de-endpoints). Todas las rutas de tareas requieren un JWT válido y operan solo sobre las tareas del usuario autenticado.

Ejemplo de creación:

```
POST /api/v1/tasks
Authorization: Bearer <JWT_FIRMADO>
Content-Type: application/json

{
  "title": "Terminar laboratorio DOSW",
  "description": "Completar pruebas del backend",
  "priority": "HIGH",
  "dueDate": "2026-09-25"
}
```

Ejemplo de error:

```
{ "status": 404, "message": "Task with id 99 was not found" }
```
## Requisito anterior · Categorías

Las historias de usuario del requisito de categorías se encuentran en Jira: https://parcialdosw.atlassian.net/jira/software/projects/AE/boards/70/timeline?atlOrigin=eyJpIjoiODRkZmJhZTYxMjU3NDM0N2JhYTI3YmQwYzFjOWJkYTgiLCJwIjoiaiJ9

## Diagramas C4 del laboratorio anterior

Estos diagramas corresponden a la versión sin autenticación. Los diagramas actualizados con la seguridad JWT están en [Diagramas de la solución](#diagramas-de-la-solución).

Diagrama de contexto:

<img width="1175" height="633" alt="image" src="https://github.com/user-attachments/assets/447b47be-accd-4230-ac7b-a1eb5aeb5496" />

Link de donde fue realizado: https://lucid.app/lucidchart/9a371200-d70f-4c62-9cec-60442e0f5a12/edit?viewport_loc=-199%2C-183%2C2096%2C1159%2C0_0&invitationId=inv_71fcfe89-a623-4dda-9718-c33c5bb0b29f

Diagrama contenedores:

<img width="635" height="599" alt="image" src="https://github.com/user-attachments/assets/729b0049-bfa7-4ba8-829e-358d129a6e8b" />

Link de donde fue realizado: https://lucid.app/lucidchart/eca753a9-0322-4724-8531-a94fe01810a4/edit?viewport_loc=-137%2C-57%2C1669%2C1159%2C0_0&invitationId=inv_eb3c0ace-f843-47fd-b452-cfe4aa538766

Diagrama de componentes backend:

<img width="1451" height="564" alt="image" src="https://github.com/user-attachments/assets/189d333c-a161-4d0a-bdcd-232d9ef65b41" />

Diagrama de componentes frontend:

<img width="1088" height="507" alt="image" src="https://github.com/user-attachments/assets/325b6b12-8a15-4fa4-8e32-9f65023bdb1d" />

Link de donde fueron realizados: https://lucid.app/lucidchart/11e63f3c-bdc9-4a8b-8b8a-f71888644489/edit?viewport_loc=-18%2C296%2C3144%2C1738%2C0_0&invitationId=inv_3e241ff6-bb87-4592-b04d-54d4e4df1726

## Pruebas

Los comandos, la matriz PT-01 a PT-18 y la cobertura están en [Pruebas de seguridad](#pruebas-de-seguridad).

## Evidencias

Las capturas del laboratorio de seguridad están en [docs/evidence/security](docs/evidence/security).

| Archivo | Evidencia |
| --- | --- |
| `00-estado-inicial-crud.png`, `00-api-sin-token.png` | Estado inicial: CRUD sin autenticación |
| `01-migracion-003.png` | Migración `003` aplicada sin perder tareas |
| `02-react-login.png` | Pantalla de inicio de sesión |
| `03-react-tareas-ana.png`, `04-react-tareas-luis.png` | Cada usuario ve solo sus tareas |
| `05-bd-tareas-por-usuario.png` | Tareas con propietarios distintos en PostgreSQL |
| `06-bd-password-hash.png` | Contraseñas almacenadas con BCrypt |
| `07-backend-tests.png`, `08-frontend-tests.png` | Pruebas automatizadas |
| `09-jacoco.png` | Reporte de cobertura |
| `10-luis-tarea-ana.png` | Acceso a una tarea ajena rechazado con 404 |
| `11-sin-token-y-alterado.png` | Peticiones sin token y con token alterado rechazadas con 401 |
| `12-admin-como-user.png`, `13-promover-admin.png`, `14-admin-como-admin.png` | Recurso administrativo con `USER` (403) y `ADMIN` (200) |
| `15-bd-despues-del-ataque.png` | Datos intactos después del intento de acceso indebido |

Las capturas del laboratorio anterior están en [docs/evidence](docs/evidence):

| N.º | Evidencia |
| --- | --- |
| 01 | PostgreSQL en Docker |
| 02 | Tabla `tasks` |
| 03 | Pruebas del Service |
| 04 | Pruebas del Controller |
| 05 | Reporte JaCoCo |
| 06 | API funcionando |
| 07 | Aplicación React |
| 08 | Creación desde React |
| 09 | Edición desde React |
| 10 | Eliminación desde React |
| 11 | Pruebas del front-end |

## Detener los servicios

```
docker stop todo-postgres
```

Los datos se conservan en el volumen `todo-postgres-data`. Para eliminar también los datos:

```
docker rm -f todo-postgres
docker volume rm todo-postgres-data
```

## Despliegue en Azure (Mariana Tovar)

La aplicación se despliega en una VM de Azure con Docker Compose. El workflow `CD - Azure VM` corre en un runner propio con la etiqueta `azure-todo` y descarga las imágenes publicadas por CI en GHCR, sin reconstruirlas. Caddy publica la app por HTTPS en `https://158.158.73.237.sslip.io`.

### C4 · Nivel 2 · Contenedores (Azure)

```mermaid
flowchart TB
    user["Usuario<br/>[Persona]"]

    subgraph gh["GitHub"]
        actions["GitHub Actions<br/>[CI y CD Azure]"]
        ghcr["GHCR<br/>[imágenes api y web con etiqueta sha-COMMIT]"]
    end

    subgraph az["Azure · VM Ubuntu"]
        runner["Runner self-hosted<br/>[etiqueta azure-todo]"]
        subgraph net["Red privada Docker: internal"]
            proxy["Caddy<br/>[HTTPS, puertos 80 y 443]"]
            web["Frontend<br/>[React + Nginx, puerto 80]"]
            api["Backend<br/>[Spring Boot, puerto 8080]"]
            db[("PostgreSQL 17<br/>[puerto 5432]")]
        end
        vol[("Volumen todo_pgdata")]
    end

    user -->|"HTTPS 443"| proxy
    proxy --> web
    web -->|"proxy /api/"| api
    api -->|"JDBC"| db
    db --- vol
    actions -->|"publica imágenes"| ghcr
    actions -->|"ejecuta el job de CD"| runner
    ghcr -->|"pull de imágenes"| runner
    runner -->|"docker compose up -d"| net
```

### Diagrama de despliegue (Azure)

```mermaid
flowchart LR
    browser["Navegador del usuario"]

    subgraph vm["Nodo: VM Azure vm-dosw-todo-azure · IP 158.158.73.237"]
        direction TB
        runner["Runner azure-todo"]
        subgraph docker["Docker Engine · red privada internal"]
            proxy["proxy · caddy:2-alpine<br/>puertos públicos 80 y 443"]
            frontend["frontend · Nginx<br/>puerto interno 80"]
            backend["backend · Spring Boot<br/>puerto interno 8080"]
            db["db · postgres:17-alpine<br/>puerto interno 5432"]
        end
        vol[("Volumen Docker todo_pgdata")]
    end

    browser -->|"HTTPS 443"| proxy
    proxy --> frontend
    frontend -->|"/api/"| backend
    backend --> db
    db --- vol
    runner -.->|"docker compose"| docker
```

Solo Caddy expone puertos hacia Internet (80 y 443). El frontend, el backend y la base de datos solo son accesibles dentro de la red privada de Docker.

### Evidencias de Azure

| Evidencia | Captura |
|---|---|
| Pipeline de despliegue en verde | ![Deploy verde](docs/ci-cd-evidencias/azure-02-deploy-verde.png) |
| Docker instalado en la VM | ![Docker](docs/ci-cd-evidencias/azure-03-docker.png) |
| App por HTTPS con sesión iniciada | ![App HTTPS](docs/ci-cd-evidencias/azure-06-app-https.png) |
| Contenedores en ejecución | ![Compose ps](docs/ci-cd-evidencias/azure-07-compose-ps.png) |
| Persistencia tras recrear contenedores | ![Persistencia](docs/ci-cd-evidencias/azure-09.png) |
