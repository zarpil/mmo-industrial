import { Pool } from 'pg';

export const pool = new Pool({
  user: process.env.POSTGRES_USER || 'mmo_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'mmo_db',
  password: process.env.POSTGRES_PASSWORD || 'mmo_password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        money DECIMAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS parcels (
        id VARCHAR(255) PRIMARY KEY,
        owner_id VARCHAR(255) REFERENCES players(id),
        type VARCHAR(50) NOT NULL,
        area_sqm FLOAT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS machine_instances (
        id VARCHAR(255) PRIMARY KEY,
        parcel_id VARCHAR(255) REFERENCES parcels(id),
        owner_id VARCHAR(255) REFERENCES players(id),
        machine_data_id VARCHAR(255) NOT NULL,
        inventory JSONB DEFAULT '{"slots": [], "maxVolume": 100}'::jsonb,
        status VARCHAR(50) DEFAULT 'idle',
        last_tick_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Base de datos inicializada (Esquemas listos)');
  } catch (error) {
    console.error('❌ Error inicializando DB:', error);
  } finally {
    client.release();
  }
}
