import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadCandidate, SteamGridDbError, type CoverCandidate } from '$lib/server/steamgriddb';

function parseCandidate(value: unknown): CoverCandidate | null {
	if (typeof value !== 'object' || value === null) return null;
	const c = value as Record<string, unknown>;
	if (typeof c.id !== 'number' || typeof c.url !== 'string' || typeof c.mime !== 'string') {
		return null;
	}
	return {
		id: c.id,
		url: c.url,
		mime: c.mime,
		author: typeof c.author === 'string' ? c.author : null,
		source: 'sgdb'
	};
}

/** Downloads a cover candidate the user picked (from the list returned by /admin/api/steamgriddb). */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const gameId = Number(body?.gameId);
	const candidate = parseCandidate(body?.candidate);

	if (!Number.isInteger(gameId) || gameId <= 0) {
		return json({ error: 'Ungültige SteamGridDB-Game-ID.' }, { status: 400 });
	}
	if (!candidate) {
		return json({ error: 'Ungültige Cover-Auswahl.' }, { status: 400 });
	}

	try {
		const result = await downloadCandidate(gameId, candidate);
		return json(result);
	} catch (err) {
		const message = err instanceof SteamGridDbError ? err.message : 'Unerwarteter Fehler.';
		return json({ error: message }, { status: 502 });
	}
};
