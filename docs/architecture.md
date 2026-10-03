# Arquitectura del Sistema

## Overview
El proyecto utiliza una arquitectura orientada a servicios dentro de un Monorepo, separando claramente las responsabilidades para permitir alta concurrencia.

### Tecnologías
- **Frontend**: React + Vite + TypeScript.
- **Backend**: Node.js + TypeScript (Game Server + Tick Engine).
- **Base de Datos Principal**: PostgreSQL (Datos de jugadores, parcelas, inventarios).
- **Caché y Memoria**: Redis (Sincronización en tiempo real y engine del mercado).
- **Infraestructura**: Docker y Docker Compose para desarrollo local y despliegue.

## Componentes Principales

1. **Game Server (Autoritativo)**
   - Validación de las interacciones del jugador vía WebSockets.
   - Peticiones REST para acciones lentas (historiales, perfiles).

2. **Simulation Engine (Tick Server)**
   - Maneja el progreso "offline" mediante simulación de catch-up determinista.
   - Limita la producción basándose en la capacidad máxima de inventario de las máquinas.

3. **Módulo de Generación de Mundo**
   - Ingesta de datos geográficos (GeoJSON / OpenStreetMap).
   - Convierte polígonos del mundo real en "Parcelas" del juego con propiedades (Rústica, Urbana, Industrial, etc).
