import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// better-sqlite3 expects a plain filesystem path, not a "file:" URL scheme.
const dbPath = env.DATABASE_URL.replace(/^file:/, '');

const client = new Database(dbPath);

export const db = drizzle(client, { schema });

const migrationsFolder = path.resolve('drizzle');

function tableExists(name: string): boolean {
	return Boolean(
		client.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)
	);
}

/**
 * This project only ever used `drizzle-kit push` before versioned migrations
 * were introduced, so an existing deployment can already have the
 * games/settings tables with no `__drizzle_migrations` bookkeeping —
 * migrate() would then try to CREATE TABLE again and fail. Baseline such a
 * DB by marking migration 0000 as already applied (matching exactly what
 * push already created) before handing off to migrate() for anything after
 * it. Fresh databases (neither table exists) skip this and let migrate()
 * create everything from scratch as usual.
 */
function baselinePreMigrationSchema(): void {
	if (tableExists('__drizzle_migrations')) return;
	if (!tableExists('games') || !tableExists('settings')) return;

	const journal = JSON.parse(
		fs.readFileSync(path.join(migrationsFolder, 'meta/_journal.json'), 'utf8')
	) as { entries: { tag: string; when: number }[] };

	client.exec(
		'CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)'
	);
	const insert = client.prepare(
		'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)'
	);
	for (const entry of journal.entries) {
		const sqlText = fs.readFileSync(path.join(migrationsFolder, `${entry.tag}.sql`), 'utf8');
		const hash = crypto.createHash('sha256').update(sqlText).digest('hex');
		insert.run(hash, entry.when);
	}
}

// Runs on every boot — a no-op once the schema is already current. This is
// what actually creates the tables on a fresh deploy; `npm run db:push` is
// only for local dev schema iteration, nothing runs it in production.
baselinePreMigrationSchema();
migrate(db, { migrationsFolder });
