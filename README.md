# MMO Industrial (Prototipo Vertical)

Un juego MMO de navegador persistente enfocado en economía, extracción, industria logística y propiedad de bienes raíces basados en mapas del mundo real.

## Estructura del Monorepo

* `/apps/client`: Frontend React (Vite) con WebSockets.
* `/apps/server`: Backend Node.js Autoritativo (Socket.io) y Tick Engine.
* `/packages/shared`: Tipos de TypeScript compartidos.
* `/packages/game-data`: Catálogo Data-Driven de ítems, máquinas y recetas.
* `/docs`: Documentación y visión arquitectónica de todo el proyecto.

## Cómo arrancar en local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Levantar base de datos (Requiere Docker):**
   ```bash
   docker-compose up -d
   ```

3. **Arrancar el servidor de juego:**
   ```bash
   npm run dev -w apps/server
   ```

4. **Arrancar el cliente web:**
   ```bash
   npm run dev -w apps/client
   ```
