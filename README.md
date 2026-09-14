# Gestión-app — Finanzas Personales (Code-Pulse)

## ¿De qué se trata este proyecto?

Es una aplicación web fullstack para llevar el control integral y ordenado de los ingresos y egresos (gastos) de una persona en un solo lugar — sin hojas de cálculo sueltas ni apuntes olvidados en el teléfono. 

La propuesta es clara y confiable: la persona inicia sesión (con sus credenciales o con su cuenta de Google), analiza su situación financiera a través de un Dashboard visual con gráficas y métricas clave, registra nuevas transacciones con validaciones de saldo inteligente, y consulta o administra el historial completo de sus movimientos con filtros, búsqueda, edición y eliminación.

El proyecto se encuentra **100% completado**, con todas sus capas integradas, probadas y funcionales de extremo a extremo.

---

## ¿Qué funciones ofrece el proyecto?

### 1. Inicio de sesión y seguridad (Credenciales + Google Identity Services)
- **Acceso tradicional**: La persona ingresa con usuario y contraseña. Las contraseñas se almacenan encriptadas con `bcryptjs` (hash irreversible).
- **Acceso con Google**: Botón integrado con Google Identity Services (GIS). Al hacer clic en "Continuar con Google", el token ID es verificado por el backend con la librería oficial `google-auth-library`. Si es la primera vez que ingresa, el sistema crea la cuenta automáticamente; si ya existía por correo, vincula su identidad de Google de forma transparente y segura.
- **Sesiones protegidas y caducidad por inactividad**: La autenticación emite un token JWT que expira automáticamente, cerrando la sesión si se detecta inactividad prolongada y notificando al usuario en pantalla.
- **Roles**: Soporta cuentas de administrador (`ADMIN`) y usuario estándar (`USER`).

### 2. Registro público de cuentas (`/registro`)
- Permite a nuevos usuarios registrarse directamente indicando su nombre, apellido, correo electrónico, nombre de usuario, género, teléfono (opcional) y contraseña (con validación de coincidencia y longitud mínima de 8 caracteres).
- Al completar el registro, el sistema autentica automáticamente al usuario y lo redirige al Dashboard sin pasos intermedios molestos.

### 3. Dashboard Financiero inteligente (`/dashboard`)
La pantalla principal tras identificarse ofrece una lectura clara y dinámica de las finanzas del usuario:
- **4 tarjetas de resumen**:
  - **Total de Ingresos**: Suma histórica de todos los ingresos.
  - **Total de Egresos**: Suma histórica de todos los egresos.
  - **Balance Total**: Saldo neto actual disponible.
  - **Ahorro de este mes**: Variación porcentual y desempeño respecto al mes anterior.
- **2 gráficas interactivas SVG nativas**:
  - Gráfica de línea con el balance anual histórico.
  - Gráfica de barras con el balance mes a mes del año en curso.
- Se calculan y actualizan en tiempo real desde el backend (`GET /api/movimientos/resumen`).

### 4. Nuevo Registro — Ingresos y Egresos con control de balance (`/nuevo-registro`)
Pantalla para agregar movimientos financieros de forma individual o en lote:
- **Toggle intuitivo Ingreso / Egreso**: Permite alternar fácilmente el tipo de transacción a registrar.
- **Control estricto contra balances negativos (Regla de negocio)**:
  - El sistema analiza cuántos ingresos existen y no permite registrar ningún egreso que exceda el dinero disponible.
  - Si el usuario intenta agregar un egreso superior a los ingresos existentes, el sistema bloquea la acción y emite el mensaje:
    > *"No se puede registrar el egreso porque supera el límite de los ingresos ya ingresados anteriormente."*
  - Se muestra además un indicador en tiempo real con el límite disponible para egresos.
- **Vista previa interactiva**: Las transacciones se acumulan en una lista antes de confirmarse. El usuario puede revisar totales, quitar filas individuales y, al presionar **"Guardar registro"**, se envían todas en una única transacción atómica a PostgreSQL (`POST /api/movimientos/lote`).

### 5. Historial completo y administración de Registros (`/registros`)
Una vista detallada con el historial de todos los movimientos guardados:
- **Filtros rápidos**: Filtrado por tipo (*Todos*, *Ingresos*, *Egresos*) y por período (*Histórico completo* o *Este Mes*).
- **Buscador en tiempo real**: Filtra instantáneamente por descripción o categoría.
- **Paginación dinámica**: Presentación en páginas de 7 registros para navegación fluida.
- **Modal de Detalle**: Consulta todos los datos de un movimiento específico.
- **Edición segura**: Modificación de descripción, categoría, monto o tipo (`PUT /api/movimientos/:id`), validando que un cambio de monto o tipo no genere un balance negativo.
- **Eliminación protegida**: Permite borrar registros (`DELETE /api/movimientos/:id`), impidiendo eliminar un ingreso si los egresos existentes superasen los ingresos restantes.

---

## Documentación técnica

### Arquitectura y Tecnologías

| Capa       | Tecnologías principales                                                                 |
|------------|------------------------------------------------------------------------------------------|
| Backend    | Node.js, Express, TypeScript, PostgreSQL (`pg`), JWT, bcryptjs, `google-auth-library`   |
| Frontend   | Angular 21 (Componentes Standalone, Signals, Reactive Forms), TypeScript, SVG nativo    |
| Seguridad  | JSON Web Tokens (Bearer), Google Identity Services (GIS), Hash Bcrypt con salt rounds   |
| Estilos    | CSS moderno con variables CSS, animaciones fluidas y diseño adaptativo                  |
| Paquetería | pnpm                                                                                     |

### Estructura del Proyecto

```text
gestion-app-2024057-entrega-final/
├── README.md
├── backend/
│   ├── db/
│   │   └── init.sql              # Creación de tablas (usuarios, movimientos) e índices
│   ├── src/
│   │   ├── config/               # Conexión a base de datos y resolución de variables de entorno
│   │   ├── controllers/          # Controladores REST (auth, usuarios, movimientos)
│   │   ├── middlewares/          # Autenticación JWT y manejador global de errores
│   │   ├── models/               # Modelos y contratos TypeScript
│   │   ├── repositories/         # Capa de acceso a datos y consultas SQL
│   │   ├── routes/               # Rutas de la API (/api/auth, /api/usuarios, /api/movimientos)
│   │   ├── services/             # Lógica de negocio (reglas de balance, Google OAuth, etc.)
│   │   ├── utils/                # Utilidades de error HTTP (ApiError)
│   │   ├── app.ts                # Inicialización de Express y CORS
│   │   ├── server.ts             # Arranque del servidor HTTP
│   │   └── seed.ts               # Poblamiento inicial idempotente (admin / user)
│   ├── .env.example              # Plantilla de variables de entorno
│   └── package.json
└── frontend/
    ├── src/
    │   ├── index.html            # Carga del SDK de Google Identity Services
    │   └── app/
    │       ├── core/
    │       │   ├── config/       # Configuración de URLs base y Google Client ID
    │       │   ├── guards/       # authGuard (protección de rutas privadas)
    │       │   ├── interceptors/ # authInterceptor (inyección automática del token Bearer)
    │       │   ├── models/       # Interfaces frontend (usuario, movimiento, resumen)
    │       │   └── services/     # AuthService, MovimientoService, SesionExpiradaService
    │       ├── shared/
    │       │   └── graficas/     # Generador de gráficas SVG nativas
    │       └── features/
    │           ├── login/        # Inicio de sesión tradicional y botón Google
    │           ├── registro/     # Creación de nuevas cuentas de usuario
    │           ├── dashboard/    # Panel visual con métricas y gráficas
    │           ├── nuevo-registro/ # Formulario de ingresos y egresos con límite de balance
    │           └── registros/    # Historial de transacciones con búsqueda, edición y borrado
    └── package.json
```

---

## Instalación y Puesta en Marcha

### Requisitos previos
- **Node.js**: Versión 20 o superior (recomendado Node 22).
- **pnpm**: Gestor de paquetes (`npm install -g pnpm`).
- **PostgreSQL**: Versión 14 o superior en ejecución local.

### 1. Clonar el repositorio
```powershell
git clone <URL_DEL_REPOSITORIO>
cd gestion-app-2024057-entrega-final
```

### 2. Configurar la Base de Datos
Desde tu cliente de PostgreSQL favorito (psql, pgAdmin 4, DBeaver):
```powershell
psql -U postgres -c "CREATE DATABASE finanzas_personales;"
psql -U postgres -d finanzas_personales -f backend/db/init.sql
```

El script [backend/db/init.sql](backend/db/init.sql) crea:
- Tabla `usuarios`: Con soporte para contraseña local nula (para usuarios de Google) y campo único `google_id`.
- Tabla `movimientos`: Con soporte para `INGRESO` y `EGRESO`, monto positivo, categoría y relación en cascada con el usuario.

### 3. Configurar y levantar el Backend

1. Entra a la carpeta del backend e instala dependencias:
   ```powershell
   cd backend
   pnpm install
   ```

2. Configura las variables de entorno en `backend/.env`:
   ```dotenv
   PORT=4000

   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=finanzas_personales
   DB_USER=postgres
   DB_PASSWORD=admin

   JWT_SECRET=Koda2021@
   JWT_EXPIRES_IN=4h

   GOOGLE_CLIENT_ID=54233591416-tl9qusi7f4vq8co8evl3g8dpvti5u0em.apps.googleusercontent.com

   CORS_ORIGIN=http://localhost:4200
   ```

3. Ejecuta el script de semilla (Seed) para crear los usuarios base de prueba:
   ```powershell
   pnpm seed
   ```

   *Usuarios creados:*
   | Usuario | Contraseña | Rol |
   |---|---|---|
   | `admin` | `Admin123!` | ADMIN |
   | `user` | `User123!` | USER |

4. Inicia el servidor backend en modo desarrollo:
   ```powershell
   pnpm dev
   ```
   El servidor estará escuchando en `http://localhost:4000`.

### 4. Configurar y levantar el Frontend

1. En una nueva terminal, entra a la carpeta del frontend e instala dependencias:
   ```powershell
   cd frontend
   pnpm install
   ```

2. Inicia la aplicación Angular:
   ```powershell
   pnpm start
   ```
   La aplicación se abrirá en `http://localhost:4200`.

---

## Cómo funciona cada módulo por dentro

### 1. Autenticación con Google y Local
- **Google OAuth2**: Al hacer clic en el botón renderizado por Google Identity Services, se obtiene una credencial JWT firmada por Google. El frontend la envía a `POST /api/auth/google`. El backend valida el token con `clienteGoogle.verifyIdToken({ idToken, audience })`, comprueba que el email esté verificado, busca si el usuario existe o lo registra automáticamente asignándole un nombre de usuario único, y devuelve un token JWT del sistema.
- **Autenticación local**: Compara con `bcrypt.compare()` el hash seguro de la contraseña.
- **Sesión reactiva**: Angular almacena el token y los datos públicos en `localStorage` y los expone como `Signals` reactivos (`authService.usuario`).

### 2. Regla de Oro: Control de Límites para Egresos
- **Fórmula**: $\text{Balance Disponible} = \text{Total Ingresos} - \text{Total Egresos}$.
- Tanto en el formulario de `/nuevo-registro` al presionar *"+ Agregar a la lista"*, como al presionar *"Guardar registro"*, el sistema verifica que la cantidad del egreso no supere el saldo disponible acumulado.
- Si no hay ingresos previos o el egreso sobrepasa el monto disponible, se aborta la acción y se notifica inmediatamente al usuario.
- En el backend, las funciones `crear`, `crearLote`, `actualizar` y `eliminar` garantizan a nivel de base de datos que jamás quede un saldo negativo bajo ninguna circunstancia.

### 3. Gráficas e Indicadores Financieros
- Las gráficas del Dashboard son construidas completamente en TypeScript matemático puro mediante SVG dinámico, calculando escalas, coordenadas poligonales y ejes sin depender de librerías de terceros pesadas.

---

## Paleta de Colores del Sistema

| Variable | Valor Hex | Aplicación |
|---|---|---|
| `--color-bg-deep` | `#020617` | Fondo global de la aplicación |
| `--color-bg-surface` | `#0b1329` | Tarjetas, paneles y modales |
| `--color-accent` | `#1d5aab` | Botones principales y realces |
| `--color-accent-teal`| `#14b8c4` | Gradientes de éxito y gráficas |
| `--color-text-primary`| `#ffffff` | Títulos y valores destacados |
| `--color-text-secondary`| `#94a3b8` | Subtítulos y etiquetas secundarias |
| `--color-danger` | `#ef4444` | Alertas de límite excedido y errores |
| `--color-success` | `#22c55e` | Confirmaciones y registros guardados |

---

*Proyecto finalizado con éxito para la gestión y control inteligente de Finanzas Personales.*