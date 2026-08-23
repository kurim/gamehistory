import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getGameById, listCategories, updateGame } from '$lib/server/db/queries';
import { parseGameFormData } from '$lib/server/validation';
import { CoverUploadError, saveUploadedCover } from '$lib/server/covers';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) throw error(400, 'Ungültige ID.');

	const [game, categories] = await Promise.all([getGameById(id), listCategories()]);
	if (!game) throw error(404, 'Spiel nicht gefunden.');

	return { game, categories };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const id = Number(params.id);
		if (!Number.isInteger(id)) return fail(400, { error: 'Ungültige ID.' });

		const form = await request.formData();
		const input = parseGameFormData(form);
		if ('error' in input) return fail(400, { error: input.error });

		const coverFile = form.get('coverFile');
		if (coverFile instanceof File && coverFile.size > 0) {
			try {
				input.coverUrl = await saveUploadedCover(coverFile);
				input.gameId = null;
			} catch (err) {
				const message =
					err instanceof CoverUploadError ? err.message : 'Cover-Upload fehlgeschlagen.';
				return fail(400, { error: message });
			}
		}

		await updateGame(id, input);
		throw redirect(303, '/admin');
	}
};
