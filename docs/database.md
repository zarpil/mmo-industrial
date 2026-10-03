# Esquema de Base de Datos (PostgreSQL)

La base de datos relacional (PostgreSQL) mantendrá el estado persistente y seguro del mundo. Para el Vertical Slice, no usaremos todas las tablas complejas, pero esta es la arquitectura base.

## Tablas Principales (Vertical Slice)

### 1. `players`
- `id` (UUID, PK)
- `username` (VARCHAR, Unique)
- `money` (DECIMAL)
- `created_at` (TIMESTAMP)

### 2. `parcels`
Almacena las divisiones del mundo real (geometría y propiedad).
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> players.id, Nullable)
- `type` (VARCHAR) - 'urban', 'rural', 'industrial'
- `center_lat` (FLOAT)
- `center_lng` (FLOAT)
- `geom_polygon` (JSONB) - Las coordenadas del polígono importado de OpenStreetMap.
- `area_sqm` (FLOAT)

### 3. `machine_instances`
Máquinas construidas dentro de las parcelas.
- `id` (UUID, PK)
- `parcel_id` (UUID, FK -> parcels.id)
- `owner_id` (UUID, FK -> players.id)
- `machine_data_id` (VARCHAR) - Referencia al catálogo de datos (ej. "iron_extractor").
- `inventory` (JSONB) - Almacena las ranuras de inventario actual. Usamos JSONB porque el inventario es dinámico.
- `status` (VARCHAR) - 'producing', 'full', 'no_resources'.
- `last_tick_at` (TIMESTAMP) - El pilar de la simulación offline. Cuando un jugador o el motor de simulación consulta esta máquina, compara `last_tick_at` con `NOW()` para calcular cuánto ha producido mientras nadie miraba.
