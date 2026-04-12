# Fintor

Aplicación de escritorio construida con [Electron](https://www.electronjs.org/).

---

## 🧰 Requisitos previos

Antes de correr el proyecto, necesitás instalar las siguientes herramientas:

### 1. Node.js
Descargalo desde la página oficial: **https://nodejs.org**

> Elegí la versión **LTS** (la que dice "Recommended For Most Users"). Esto también instala `npm` automáticamente.

### 2. pnpm
Una vez instalado Node.js, abrí una terminal y ejecutá:

```bash
npm install -g pnpm
```

> **¿Por qué pnpm y no npm?** Este proyecto usa pnpm como gestor de paquetes. Es más rápido y eficiente, pero si no te funciona, también podés usar `npm` (ver más abajo).

### 3. Git *(si no lo tenés)*
Necesitás Git para clonar el repositorio: **https://git-scm.com**

---

## 🚀 Cómo correr el proyecto

Abrí una terminal y ejecutá los siguientes comandos **en orden**:

```bash
# 1. Clonar el repositorio
git clone <URL-del-repositorio>

# 2. Entrar a la carpeta del proyecto
cd fintor

# 3. Instalar todas las dependencias
pnpm install

# 4. Iniciar la aplicación
pnpm start
```

¡Listo! La aplicación debería abrirse automáticamente.

---

## ❓ Solución de problemas

### No me funciona `pnpm`
Podés usar `npm` en su lugar. Simplemente reemplazá los comandos así:

| Comando con pnpm | Equivalente con npm |
|------------------|---------------------|
| `pnpm install`   | `npm install`       |
| `pnpm start`     | `npm start`         |

### Me aparece un error al ejecutar `pnpm install`
Asegurate de estar dentro de la carpeta del proyecto (`cd fintor`) antes de ejecutarlo.

### La app no abre después de `pnpm start`
Revisá que la instalación haya terminado correctamente sin errores. Si hay errores en rojo, copiálos y consultá con el equipo.

---

## 📁 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm start` | Inicia la aplicación en modo desarrollo |
| `pnpm run tailwind:watch` | Compila Tailwind CSS en tiempo real |
| `pnpm run make` | Genera el instalador de la aplicación |

---

## 🛠️ Tecnologías utilizadas

- [Electron](https://www.electronjs.org/) — Framework para apps de escritorio
- [Tailwind CSS](https://tailwindcss.com/) — Estilos
- [Flowbite](https://flowbite.com/) — Componentes UI

---

*Desarrollado por Gabriel Fuentes*
