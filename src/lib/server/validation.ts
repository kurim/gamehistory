import { isTrustedSteamCdnUrl } from '$lib/server/steamCdnImage';

export type GameInput = {
	name: string;
	year: number;
	category: string;
	coverUrl: string | null;
	coverLicense: string | null;
	gameId: number | null;
	wikipediaUrl: string | null;
	steamAppId: number | null;
	gogSlug: string | null;
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
		gogSlug: normalizeGogSlug(str(form.get('gogSlug'))),
		description: str(form.get('description'))
	};
}

/**
 * GOG store URLs look like `gog.com/en/game/{slug}` or `gog.com/game/{slug}`
 * — the slug itself is lowercase with underscores. Accepts a bare slug or a
 * full URL and normalizes to just the slug, mirroring the Steam App-ID
 * handling.
 */
function normalizeGogSlug(raw: string | null): string | null {
	if (!raw) return null;
	const match = raw.match(/\/game\/([a-z0-9_]+)/i);
	const slug = match ? match[1] : raw;
	return slug.trim().toLowerCase() || null;
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
	steamAppId?: unknown;
	steamId?: unknown;
	steamUrl?: unknown;
	steamdbUrl?: unknown;
	gogSlug?: unknown;
	gogUrl?: unknown;
	Image?: unknown;
	image?: unknown;
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
 * The skill sends just the numeric Steam App-ID as `steamAppId` — the app
 * builds the actual store/SteamDB links from it, mirroring how `coverUrl`
 * carries a bare SteamGridDB/IGDB ID. Also accepts `steamId` and the older
 * `steamUrl`/`steamdbUrl` field names (pre-dating the single-field format),
 * and tolerates a full URL containing the app id, for robustness.
 */
function parseSteamAppId(e: LookupGame): number | null {
	const raw = e.steamAppId ?? e.steamId ?? e.steamUrl ?? e.steamdbUrl;
	if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	if (/^\d+$/.test(trimmed)) return Number(trimmed);
	const match = trimmed.match(/\/app\/(\d+)/);
	return match ? Number(match[1]) : null;
}

/** Accepts `gogSlug` or the older/alternate `gogUrl`, tolerating a full GOG store URL. */
function parseGogSlug(e: LookupGame): string | null {
	const raw = e.gogSlug ?? e.gogUrl;
	return typeof raw === 'string' ? normalizeGogSlug(raw) : null;
}

/**
 * `Image` (or `image`) carries a direct Steam store CDN cover asset URL
 * (e.g. a `library_600x900_2x.jpg`) — offered as an extra cover candidate
 * alongside SteamGridDB/IGDB results, useful when a game has no SteamGridDB
 * entry at all. Only trusted Steam CDN hosts are accepted; anything else is
 * dropped rather than surfaced as a downloadable candidate.
 */
function parseSteamCdnImageUrl(e: LookupGame): string | null {
	const raw = e.Image ?? e.image;
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	return trimmed && isTrustedSteamCdnUrl(trimmed) ? trimmed : null;
}

/**
 * A bare `{ name, ...one-or-more-fields }` entry — no `year`/`category`, so it
 * can't create a new game, but it names an existing one (matched by title) to
 * patch specific fields on, e.g. bulk-adding `steamAppId` to already-imported
 * games without re-supplying everything else.
 */
export type GamePartialUpdate = {
	name: string;
	coverUrl: string | null;
	coverLicense: string | null;
	gameId: number | null;
	wikipediaUrl: string | null;
	steamAppId: number | null;
	gogSlug: string | null;
	description: string | null;
};

export type GameLookupImportResult = {
	games: GameInput[];
	/**
	 * Parallel to `games` — an extra Steam store CDN cover candidate per
	 * entry (the `Image` field), or `null`. Kept out of `GameInput` itself
	 * since it's not a DB column: drizzle's `.values()` maps every own key of
	 * the object it's given to a table column, so an untyped extra key would
	 * break the insert rather than just being ignored.
	 */
	gameCoverCandidates: (string | null)[];
	partialUpdates: GamePartialUpdate[];
	/** Parallel to `partialUpdates`, same reasoning as `gameCoverCandidates`. */
	partialUpdateCoverCandidates: (string | null)[];
	skipped: number;
};

/**
 * Entries that are `null` or missing required fields are skipped rather than
 * aborting the whole import — the `game-lookups` (multi-title) skill returns
 * a `null` placeholder for titles it couldn't resolve, keeping array
 * positions stable, and that shouldn't sink the rest of the batch.
 *
 * An entry with a `name` but no `year`/`category` is treated as a partial
 * update for an existing game (matched by title) rather than skipped, as
 * long as it carries at least one field worth patching.
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
	const gameCoverCandidates: (string | null)[] = [];
	const partialUpdates: GamePartialUpdate[] = [];
	const partialUpdateCoverCandidates: (string | null)[] = [];
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

		const description =
			(typeof e.description === 'string' && e.description.trim()) ||
			(typeof e.note === 'string' && e.note.trim()) ||
			null;

		const coverUrlStr = typeof e.coverUrl === 'string' ? e.coverUrl.trim() : '';
		const coverUrlIsRealUrl = coverUrlStr.length > 0 && !/^\d+$/.test(coverUrlStr);
		const coverUrl = coverUrlIsRealUrl ? coverUrlStr : null;
		const coverLicense = (typeof e.coverLicense === 'string' && e.coverLicense.trim()) || null;
		const gameId = parseLookupGameId(e);
		const wikipediaUrl = (typeof e.wikipediaUrl === 'string' && e.wikipediaUrl.trim()) || null;
		const steamAppId = parseSteamAppId(e);
		const gogSlug = parseGogSlug(e);
		const steamCdnImageUrl = parseSteamCdnImageUrl(e);

		if (!name) {
			skipped++;
			continue;
		}

		if (category && Number.isFinite(year)) {
			games.push({
				name,
				year,
				category,
				coverUrl,
				coverLicense,
				gameId,
				wikipediaUrl,
				steamAppId,
				gogSlug,
				description
			});
			gameCoverCandidates.push(steamCdnImageUrl);
			continue;
		}

		if (
			coverUrl ||
			gameId ||
			wikipediaUrl ||
			steamAppId ||
			gogSlug ||
			steamCdnImageUrl ||
			description
		) {
			partialUpdates.push({
				name,
				coverUrl,
				coverLicense,
				gameId,
				wikipediaUrl,
				steamAppId,
				gogSlug,
				description
			});
			partialUpdateCoverCandidates.push(steamCdnImageUrl);
			continue;
		}

		skipped++;
	}

	if (games.length === 0 && partialUpdates.length === 0) {
		return { error: 'Keine gültigen Einträge im JSON gefunden.' };
	}

	return { games, gameCoverCandidates, partialUpdates, partialUpdateCoverCandidates, skipped };
}
