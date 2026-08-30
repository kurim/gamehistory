import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseGameLookupJson } from '$lib/server/validation';
import { listCoverCandidates, type CoverCandidate } from '$lib/server/steamgriddb';

/**
 * Parses a JSON-import payload and, for every game with a SteamGridDB Game-ID
 * and/or a Steam store CDN `Image` and no cover already set, resolves the
 * cover candidates so the admin UI can show a preview to pick from before
 * actually importing anything.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const raw = typeof body?.json === 'string' ? body.json : '';

	const parsed = parseGameLookupJson(raw);
	if ('error' in parsed) {
		return json({ error: parsed.error }, { status: 400 });
	}

	const games = await Promise.all(
		parsed.games.map(async (game, index) => {
			let candidates: CoverCandidate[] = [];
			if (game.gameId && !game.coverUrl) {
				try {
					candidates = await listCoverCandidates(game.gameId);
				} catch {
					candidates = [];
				}
			}
			const steamCdnImageUrl = parsed.gameCoverCandidates[index];
			if (steamCdnImageUrl && !game.coverUrl) {
				candidates = [
					...candidates,
					{ id: -1, url: steamCdnImageUrl, mime: 'image/jpeg', author: null, source: 'steam' }
				];
			}
			return {
				name: game.name,
				year: game.year,
				category: game.category,
				gameId: game.gameId,
				coverUrl: game.coverUrl,
				candidates,
				selectedIndex: candidates.length > 0 ? 0 : null
			};
		})
	);

	return json({
		games,
		partialUpdates: parsed.partialUpdates.map((u) => u.name),
		skipped: parsed.skipped
	});
};
