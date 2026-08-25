export type GameInput = {
	name: string;
	year: number;
	category: string;
	coverUrl: string | null;
	coverLicense: string | null;
	gameId: number | null;
	wikipediaUrl: string | null;
	steamAppId: number | null;
	description: string | null;
};

function str(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function parseGameFormData(form: FormData): GameInput | { error: string } {
	const name = str(form.get('name'));
	const yearRaw = str(form.get('year'));
	const category = str(form.get('category'));

	if (!name) return { error: 'Name ist erforderlich.' };
	if (!yearRaw || !/^-?\d+$/.test(yearRaw)) return { error: 'Jahr muss eine Zahl sein.' };
	if (!category) return { error: 'Kategorie ist erforderlich.' };

	const gameIdRaw = str(form.get('gameId'));
	const gameId = gameIdRaw && /^\d+$/.test(gameIdRaw) ? Number(gameIdRaw) : null;

	const steamAppIdRaw = str(form.get('steamAppId'));
	const steamAppId = steamAppIdRaw && /^\d+$/.test(steamAppIdRaw) ? Number(steamAppIdRaw) : null;

	return {
		name,
		year: Number(yearRaw),
		category,
		coverUrl: str(form.get('coverUrl')),
		coverLicense: str(form.get('coverLicense')),
		gameId,
		wikipediaUrl: str(form.get('wikipediaUrl')),
		steamAppId,
		description: str(form.get('description'))
	};
}

/** Schema expected from the `game-lookup` skill's JSON output. */
type LookupGame = {
	name?: unknown;
	year?: unknown;
	category?: unknown;
	coverUrl?: unknown;
	coverLicense?: unknown;
	GameID?: unknown;
	gameId?: unknown;
	wikipediaUrl?: unknown;
	steamUrl?: unknown;
	steamdbUrl?: unknown;
	description?: unknown;
	note?: unknown;
};

function parseLookupGameId(e: LookupGame): number | null {
	const raw = e.GameID ?? e.gameId ?? (typeof e.coverUrl === 'string' ? e.coverUrl : undefined);
	if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
	if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw.trim());
	return null;
}

/**
 * The skill sends just the numeric Steam App-ID in `steamUrl`/`steamdbUrl`
 * (same ID for both — the app builds the actual store/SteamDB links from
 * it), mirroring how `coverUrl` carries a bare SteamGridDB/IGDB ID. Also
 * tolerates a full URL containing the app id, in case a caller sends one.
 */
function parseSteamAppId(e: LookupGame): number | null {
	const raw = e.steamUrl ?? e.steamdbUrl;
	if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	if (/^\d+$/.test(trimmed)) return Number(trimmed);
	const match = trimmed.match(/\/app\/(\d+)/);
	return match ? Number(match[1]) : null;
}

export type GameLookupImportResult = { games: GameInput[]; skipped: number };

/**
 * Entries that are `null` or missing required fields are skipped rather than
 * aborting the whole import — the `game-lookups` (multi-title) skill returns
 * a `null` placeholder for titles it couldn't resolve, keeping array
 * positions stable, and that shouldn't sink the rest of the batch.
 */
export function parseGameLookupJson(raw: string): GameLookupImportResult | { error: string } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { error: 'Ungültiges JSON.' };
	}

	const entries: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
	if (entries.length === 0) return { error: 'JSON enthält keine Einträge.' };

	const games: GameInput[] = [];
	let skipped = 0;
	for (const entry of entries) {
		if (typeof entry !== 'object' || entry === null) {
			skipped++;
			continue;
		}
		const e = entry as LookupGame;
		const name = typeof e.name === 'string' ? e.name.trim() : '';
		const category = typeof e.category === 'string' ? e.category.trim() : '';
		const year = typeof e.year === 'number' ? e.year : Number(e.year);

		if (!name || !category || !Number.isFinite(year)) {
			skipped++;
			continue;
		}

		const description =
			(typeof e.description === 'string' && e.description.trim()) ||
			(typeof e.note === 'string' && e.note.trim()) ||
			null;

		const coverUrlStr = typeof e.coverUrl === 'string' ? e.coverUrl.trim() : '';
		const coverUrlIsRealUrl = coverUrlStr.length > 0 && !/^\d+$/.test(coverUrlStr);

		games.push({
			name,
			year,
			category,
			coverUrl: coverUrlIsRealUrl ? coverUrlStr : null,
			coverLicense: (typeof e.coverLicense === 'string' && e.coverLicense.trim()) || null,
			gameId: parseLookupGameId(e),
			wikipediaUrl: (typeof e.wikipediaUrl === 'string' && e.wikipediaUrl.trim()) || null,
			steamAppId: parseSteamAppId(e),
			description
		});
	}

	if (games.length === 0) return { error: 'Keine gültigen Einträge im JSON gefunden.' };

	return { games, skipped };
}
