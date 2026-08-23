import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadGridForGame, SteamGridDbError } from '$lib/server/steamgriddb';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const gameId = Number(body?.gameId);

	if (!Number.isInteger(gameId) || gameId <= 0) {
		return json({ error: 'Ungültige SteamGridDB-Game-ID.' }, { status: 400 });
	}

	try {
		const result = await downloadGridForGame(gameId);
		return json(result);
	} catch (err) {
		const message = err instanceof SteamGridDbError ? err.message : 'Unerwarteter Fehler.';
		return json({ error: message }, { status: 502 });
	}
};
