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

function getApiKey(): string {
	if (!env.STEAMGRIDDB_API_KEY) {
		throw new SteamGridDbError('STEAMGRIDDB_API_KEY ist nicht konfiguriert.');
	}
	return env.STEAMGRIDDB_API_KEY;
}

/**
 * Fetches the grid (cover) list for a SteamGridDB game ID.
 * https://www.steamgriddb.com/api/v2#tag/GRIDS/operation/getGridsByGameId
 */
async function fetchTopGrid(gameId: number): Promise<SteamGridDbGrid> {
	const apiKey = getApiKey();

	const listResponse = await fetch(`https://www.steamgriddb.com/api/v2/grids/game/${gameId}`, {
		headers: { Authorization: `Bearer ${apiKey}` }
	});

	if (!listResponse.ok) {
		throw new SteamGridDbError(
			`SteamGridDB-API antwortete mit Status ${listResponse.status} für Game-ID ${gameId}.`
		);
	}

	const list = (await listResponse.json()) as SteamGridDbGridsResponse;
	if (!list.success) {
		throw new SteamGridDbError(list.errors?.join(', ') ?? 'SteamGridDB-Anfrage fehlgeschlagen.');
	}
	const grid = list.data?.[0];
	if (!grid) {
		throw new SteamGridDbError(`Keine Grids für Game-ID ${gameId} gefunden.`);
	}
	return grid;
}

function coverLicenseFor(grid: SteamGridDbGrid): string {
	return `SteamGridDB — https://www.steamgriddb.com/grid/${grid.id}${
		grid.author?.name ? ` (von ${grid.author.name})` : ''
	}`;
}

/** Downloads the top grid result for a SteamGridDB game ID to disk. */
export async function downloadGridForGame(
	gameId: number
): Promise<{ coverUrl: string; coverLicense: string }> {
	const grid = await fetchTopGrid(gameId);

	const imageResponse = await fetch(grid.url);
	if (!imageResponse.ok) {
		throw new SteamGridDbError(`Bild konnte nicht heruntergeladen werden (${grid.url}).`);
	}
	const bytes = Buffer.from(await imageResponse.arrayBuffer());
	const ext = extFromMime(grid.mime) ?? 'png';

	const coverUrl = await saveCoverImage(bytes, ext, `sgdb-${gameId}-${grid.id}`);
	return { coverUrl, coverLicense: coverLicenseFor(grid) };
}
