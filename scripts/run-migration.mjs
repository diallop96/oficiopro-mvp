#!/usr/bin/env node
import { readFileSync } from 'fs';
import pg from 'pg';

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('Falta POSTGRES_URL');
  process.exit(1);
}

const sql = readFileSync('supabase/migrations/001_initial_schema.sql', 'utf8');
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
// Forzar SSL permisivo en entornos con certificados self-signed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

try {
  await client.connect();
  await client.query(sql);
  console.log('✓ Migración ejecutada correctamente');
} catch (err) {
  if (err.message?.includes('already exists')) {
    console.log('✓ Migración ya aplicada (objetos existentes)');
  } else {
    console.error('Error:', err.message);
    process.exit(1);
  }
} finally {
  await client.end();
}
