# Visión del Proyecto: MMO Industrial

## Concepto Core
Juego de navegador MMO persistente basado en economía, industria y gestión inmobiliaria.
Inspiración: CapitalRift, Satisfactory, Factorio, Create (Minecraft).

El jugador comienza desde cero y escala construyendo fábricas, negocios, y eventualmente corporaciones en un **mundo persistente basado en el mundo real**. Para lograr el realismo geográfico, el mundo generará parcelas, carreteras y edificios base utilizando datos de sistemas GIS como OpenStreetMap.

## Principios de Diseño
1. **Todo está conectado:** Recursos -> Procesamiento -> Industria -> Consumo.
2. **Data-Driven:** Recursos, máquinas y recetas configuradas por datos (JSON/TS), no hardcodeadas.
3. **El espacio importa:** El mundo está dividido en parcelas. La ubicación define el valor y la utilidad de las infraestructuras y logística.
4. **Offline Progress:** La producción continúa mientras el jugador está desconectado, limitándose por la capacidad física de almacenamiento de las fábricas.
5. **Gestión Omnisciente:** La interacción es estilo "God View", enfocada en la gestión arquitectónica y logística en 2D/isométrico.
