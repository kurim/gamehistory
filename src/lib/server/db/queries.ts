import { asc, desc, eq } from 'drizzle-orm';
import { db } from './index';
import { games, type NewGame } from './schema';

export async function listGamesChronological() {
	return db.select().from(games).orderBy(asc(games.year), asc(games.name));
}

export async function listGamesNewestFirst() {
	return db.select().from(games).orderBy(desc(games.year), asc(games.name));
}

export async function getGameById(id: number) {
	const [game] = await db.select().from(games).where(eq(games.id, id));
	return game ?? null;
}

export async function createGame(data: Omit<NewGame, 'id' | 'createdAt'>) {
	const [created] = await db.insert(games).values(data).returning();
	return created;
}

export async function updateGame(id: number, data: Partial<Omit<NewGame, 'id' | 'createdAt'>>) {
	const [updated] = await db.update(games).set(data).where(eq(games.id, id)).returning();
	return updated;
}

export async function deleteGame(id: number) {
	await db.delete(games).where(eq(games.id, id));
}

/** Lightweight fetch for duplicate-detection/merging during import — avoids pulling created-at etc. */
export async function listGamesForImportMerge() {
	return db
		.select({
			id: games.id,
			name: games.name,
			year: games.year,
			coverUrl: games.coverUrl,
			coverLicense: games.coverLicense,
			gameId: games.gameId,
			wikipediaUrl: games.wikipediaUrl,
			steamAppId: games.steamAppId,
			gogSlug: games.gogSlug,
			description: games.description
		})
		.from(games);
}

export async function listCategories() {
	const rows = await db.selectDistinct({ category: games.category }).from(games);
	return rows.map((r) => r.category).sort((a, b) => a.localeCompare(b));
}
