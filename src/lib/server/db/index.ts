import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// better-sqlite3 expects a plain filesystem path, not a "file:" URL scheme.
const dbPath = env.DATABASE_URL.replace(/^file:/, '');

const client = new Database(dbPath);

export const db = drizzle(client, { schema });
