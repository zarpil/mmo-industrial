# Roadmap y Plan de Trabajo

## Fases 1 a 4: Diseño y Estructura (En progreso)
- [x] Análisis del concepto y toma de decisiones.
- [x] Setup del Monorepo (pnpm/npm workspaces).
- [x] Documentación base (Visión, Arquitectura).

## Fase 5: Modelos de Datos (Próximo paso)
- Esquemas de bases de datos para PostgreSQL.
- Modelos TypeScript en el paquete compartido (`shared`).
- Representación de `Parcel`, `Machine`, `Item`, `Inventory`.

## Fase 6 y 7: Backend y Cliente Mínimo
- Setup Express + WebSockets (Socket.io/ws).
- Setup Vite + React (UI Básica).
- Integración con Docker (Postgres/Redis).

## Fase 8: Persistencia e Inicialización del Mundo
- Importación de una zona real pequeña (ej. una manzana de una ciudad) vía GeoJSON a parcelas en BD.

## Fase 9: Vertical Slice
1. Jugador inicia sesión (anónimo/UUID).
2. Se le asigna 1 parcela vacía.
3. Construye 1 máquina básica (ej. Mina de Carbón).
4. La máquina produce Carbón por "ticks".
5. Se almacena en la parcela.
6. El jugador "vende" el carbón al servidor por créditos.
7. Se desconecta, recarga y todo sigue funcionando.
