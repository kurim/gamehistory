import { env } from '$env/dynamic/private';
import { extFromMime, saveCoverImage } from '$lib/server/covers';

type SteamGridDbGrid = {
	id: number;
	url: string;
	mime: string;
	author?: { name?: string } | null;
};

type SteamGridDbGridsResponse = {
	success: boolean;
	errors?: string[];
	data?: SteamGridDbGrid[];
};

export class SteamGridDbError extends Error {}

export type CoverCandidate = {
	id: number;
	url: string;
	mime: string;
	author: string | null;
};

function getApiKey(): string {
	if (!env.STEAMGRIDDB_API_KEY) {
		throw new SteamGridDbError('STEAMGRIDDB_API_KEY ist nicht konfiguriert.');
	}
	return env.STEAMGRIDDB_API_KEY;
}

/**
 * Fetches the grid (cover) list for a SteamGridDB game ID.
 * https://www.steamgriddb.com/api/v2#tag/GRIDS/operation/getGridsByGameId
 *
 * Restricted to the 600x900 (2:3) portrait dimension — the only one SteamGridDB
 * offers that's an exact match for the app's cover aspect ratio. Without this,
 * the API also returns banner-style (460x215, 920x430) and square (512x512,
 * 1024x1024) grids, which get visibly cropped/distorted by object-cover.
 */
async function fetchGrids(gameId: number): Promise<SteamGridDbGrid[]> {
	const apiKey = getApiKey();

	const listResponse = await fetch(
		`https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=600x900`,
		{ headers: { Authorization: `Bearer ${apiKey}` } }
	);

	if (!listResponse.ok) {
		throw new SteamGridDbError(
			`SteamGridDB-API antwortete mit Status ${listResponse.status} für Game-ID ${gameId}.`
		);
	}

	const list = (await listResponse.json()) as SteamGridDbGridsResponse;
	if (!list.success) {
		throw new SteamGridDbError(list.errors?.join(', ') ?? 'SteamGridDB-Anfrage fehlgeschlagen.');
	}
	return list.data ?? [];
}

/** Top N grid (cover) candidates for a SteamGridDB game ID, for the user to pick from. */
export async function listCoverCandidates(gameId: number, limit = 5): Promise<CoverCandidate[]> {
	const grids = await fetchGrids(gameId);
	if (grids.length === 0) {
		throw new SteamGridDbError(
			`Keine 600x900-Grids für Game-ID ${gameId} gefunden (andere Seitenverhältnisse werden ausgeblendet).`
		);
	}
	return grids.slice(0, limit).map((g) => ({
		id: g.id,
		url: g.url,
		mime: g.mime,
		author: g.author?.name ?? null
	}));
}

function coverLicenseFor(candidate: CoverCandidate): string {
	return `SteamGridDB — https://www.steamgriddb.com/grid/${candidate.id}${
		candidate.author ? ` (von ${candidate.author})` : ''
	}`;
}

/** Only ever download images from SteamGridDB's own CDN, never an arbitrary client-supplied host. */
function isTrustedSteamGridDbUrl(url: string): boolean {
	try {
		return new URL(url).hostname.endsWith('.steamgriddb.com');
	} catch {
		return false;
	}
}

/** Downloads a chosen cover candidate to disk. */
export async function downloadCandidate(
	gameId: number,
	candidate: CoverCandidate
): Promise<{ coverUrl: string; coverLicense: string }> {
	if (!isTrustedSteamGridDbUrl(candidate.url)) {
		throw new SteamGridDbError('Ungültige Cover-URL.');
	}

	const imageResponse = await fetch(candidate.url);
	if (!imageResponse.ok) {
		throw new SteamGridDbError(`Bild konnte nicht heruntergeladen werden (${candidate.url}).`);
	}
	const bytes = Buffer.from(await imageResponse.arrayBuffer());
	const ext = extFromMime(candidate.mime) ?? 'png';

	const coverUrl = await saveCoverImage(bytes, ext, `sgdb-${gameId}-${candidate.id}`);
	return { coverUrl, coverLicense: coverLicenseFor(candidate) };
}

/**
 * Downloads the top grid result for a SteamGridDB game ID — used as the
 * automatic fallback when no cover was picked via listCoverCandidates
 * (e.g. bulk JSON import without a preview step).
 */
export async function downloadGridForGame(
	gameId: number
): Promise<{ coverUrl: string; coverLicense: string }> {
	const [top] = await listCoverCandidates(gameId, 1);
	return downloadCandidate(gameId, top);
}
