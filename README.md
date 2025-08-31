# Proyecto Angular: Instrucciones de Instalación y Configuración

Este proyecto fue generado [Angular CLI](https://github.com/angular/angular-cli) (version 18.0.3) como framework frontend y se conecta a una API Django en el backend.

---

## Requisitos

- Node.js: 18.x o 20.x (recomendado)
- npm: 9.x o superior
- Angular CLI: 18.0.3+

---

## Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/maurixavi/CaDQM-phase2-dq-assessment-frontend
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Verificar instalación de Angular CLI
```bash
ng version
```

---

## Ejecución de la aplicación

```bash
ng serve
```

La aplicación estará disponible en `http://127.0.0.1:4200/` o `http://localhost:4200/`

---

## Estructura del proyecto

```
src/
├── app/
│   ├── components/       # Componentes reutilizables
│   ├── pages/           # Páginas de la aplicación (organizadas por funcionalidad)
│   ├── services/        # Servicios para comunicación con API
│   ├── shared/          # Utilidades y componentes compartidos
│   └── app.module.ts    # Módulo principal
├── assets/              # Archivos estáticos
└── styles/              # Estilos globales
```

---


