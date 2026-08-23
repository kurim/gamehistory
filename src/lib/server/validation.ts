export type GameInput = {
	name: string;
	year: number;
	category: string;
	coverUrl: string | null;
	coverLicense: string | null;
	gameId: number | null;
	wikipediaUrl: string | null;
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

	return {
		name,
		year: Number(yearRaw),
		category,
		coverUrl: str(form.get('coverUrl')),
		coverLicense: str(form.get('coverLicense')),
		gameId,
		wikipediaUrl: str(form.get('wikipediaUrl')),
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
	description?: unknown;
	note?: unknown;
};

function parseLookupGameId(e: LookupGame): number | null {
	const raw = e.GameID ?? e.gameId ?? (typeof e.coverUrl === 'string' ? e.coverUrl : undefined);
	if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
	if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw.trim());
	return null;
}

export function parseGameLookupJson(raw: string): GameInput[] | { error: string } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { error: 'Ungültiges JSON.' };
	}

	const entries: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
	if (entries.length === 0) return { error: 'JSON enthält keine Einträge.' };

	const games: GameInput[] = [];
	for (const [i, entry] of entries.entries()) {
		if (typeof entry !== 'object' || entry === null) {
			return { error: `Eintrag ${i + 1} ist kein Objekt.` };
		}
		const e = entry as LookupGame;
		const name = typeof e.name === 'string' ? e.name.trim() : '';
		const category = typeof e.category === 'string' ? e.category.trim() : '';
		const year = typeof e.year === 'number' ? e.year : Number(e.year);

		if (!name) return { error: `Eintrag ${i + 1}: "name" fehlt.` };
		if (!Number.isFinite(year))
			return { error: `Eintrag ${i + 1}: "year" fehlt oder ist ungültig.` };
		if (!category) return { error: `Eintrag ${i + 1}: "category" fehlt.` };

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
			description
		});
	}

	return games;
}
