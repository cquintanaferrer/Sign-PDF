# Sign PDF Client

Una aplicación moderna y rápida para el flujo de firma digital de PDFs utilizando React, TypeScript y Tailwind CSS v4, ejecutándose dentro del ecosistema de Figma Make.

## 🛠️ Tecnologías

- **Framework:** React 19 (con TypeScript)
- **Compilador/Servidor:** Vite 8
- **Estilos:** Tailwind CSS v4 (utilizando `@tailwindcss/vite` para un alto rendimiento)
- **Contenedores:** Docker & Docker Compose (con Nginx para producción)
- **Formateador:** `oxfmt`

---

## 📂 Estructura del Proyecto

La estructura profesional recomendada para este proyecto es la siguiente:

```text
├── .figma/               # Configuración interna para Figma Make
├── src/
│   ├── assets/           # Recursos estáticos (imágenes, logos, etc.)
│   ├── components/       # Componentes de React modulares (vistas de la app)
│   │   ├── AlgorithmScreen.tsx
│   │   ├── AuthLayout.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── OtpScreen.tsx
│   │   ├── ProcessingScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── SuccessScreen.tsx
│   │   └── icons.tsx
│   ├── types/            # Definición de tipos TypeScript globales
│   │   └── index.ts
│   ├── App.tsx           # Componente principal y enrutador de pantallas
│   ├── index.css         # Estilos globales y entrada de Tailwind CSS
│   ├── main.tsx          # Punto de entrada de React
│   └── vite-env.d.ts     # Tipos de Vite
├── Dockerfile            # Configuración de compilación y servidor Nginx para Docker
├── docker-compose.yml    # Orquestador local para ejecutar la versión Dockerizada
├── nginx.conf            # Configuración para servir la SPA en Nginx
├── index.html            # Shell HTML de Vite
├── package.json          # Dependencias y scripts del proyecto
├── pnpm-lock.yaml        # Lockfile de dependencias
├── tsconfig.json         # Configuración del compilador TypeScript
└── vite.config.ts        # Configuración de Vite con plugins de React, Tailwind v4 y Figma Make
```

---

## 🚀 Guía de Desarrollo Local

### Requisitos Previos

Asegúrate de tener instalado:
- **Node.js** (v22 o superior recomendado)
- **pnpm** (instalado globalmente) o en su defecto **npm**

### Instalación de Dependencias

```bash
pnpm install
```

### Ejecutar Servidor de Desarrollo

```bash
pnpm dev
```
El servidor arrancará en la dirección local por defecto de Vite (usualmente accesible vía el panel de Figma o en `http://localhost:8443`).

### Formatear Código

```bash
pnpm format
```

### Compilar para Producción (Local)

Para generar la compilación estática optimizada en la carpeta `dist/`:
```bash
pnpm build
```

---

## 🐳 Ejecución con Docker (Producción)

Si deseas servir la aplicación dentro de un contenedor Docker localmente o desplegarla a producción:

### Construir y Levantar el Contenedor

```bash
docker compose up --build -d
```

La aplicación estará disponible en `http://localhost:8080` a través de un servidor **Nginx** optimizado.

### Detener el Contenedor

```bash
docker compose down
```

---

## 📦 Subir a un Repositorio de GitHub

Sigue estos pasos para subir este proyecto a tu GitHub:

1. **Inicializar Git localmente** (si no se ha hecho aún):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Professional setup with Docker and TS types"
   ```

2. **Crear un nuevo repositorio en GitHub** (público o privado) sin inicializarlo con README ni `.gitignore`.

3. **Asociar y subir tu código**:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```
