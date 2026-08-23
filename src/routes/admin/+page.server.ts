import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createGame,
	deleteGame,
	listCategories,
	listGamesNewestFirst,
	listNameYearPairs
} from '$lib/server/db/queries';
import { parseGameFormData, parseGameLookupJson } from '$lib/server/validation';
import { SESSION_COOKIE } from '$lib/server/auth/session';
import { CoverUploadError, saveUploadedCover } from '$lib/server/covers';
import { downloadGridForGame } from '$lib/server/steamgriddb';
import { createAdminAccount, updateAppearance } from '$lib/server/db/settings';
import { getEffectiveAdminUsername, verifyAdminCredentials } from '$lib/server/auth/password';
import { isValidHexColor } from '$lib/theme';
import argon2 from 'argon2';

export const load: PageServerLoad = async () => {
	const [games, categories] = await Promise.all([listGamesNewestFirst(), listCategories()]);
	return { games, categories };
};

export const actions: Actions = {
	create: async ({ request }) => {
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

		await createGame(input);
		return { success: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id)) return fail(400, { error: 'Ungültige ID.' });

		await deleteGame(id);
		return { success: true };
	},

	importJson: async ({ request }) => {
		const form = await request.formData();
		const raw = String(form.get('json') ?? '');
		const parsed = parseGameLookupJson(raw);
		if ('error' in parsed) return fail(400, { error: parsed.error });

		const dedupeKey = (name: string, year: number) => `${name.trim().toLowerCase()}::${year}`;
		const existing = new Set((await listNameYearPairs()).map((g) => dedupeKey(g.name, g.year)));

		let imported = 0;
		let duplicates = 0;
		let coverFailures = 0;
		for (const game of parsed.games) {
			const key = dedupeKey(game.name, game.year);
			if (existing.has(key)) {
				duplicates++;
				continue;
			}
			existing.add(key); // guards against duplicates within the same JSON batch too

			if (game.gameId && !game.coverUrl) {
				try {
					const resolved = await downloadGridForGame(game.gameId);
					game.coverUrl = resolved.coverUrl;
					game.coverLicense = resolved.coverLicense;
				} catch {
					coverFailures++;
					game.coverUrl = null;
					game.coverLicense = null;
					game.gameId = null;
				}
			}
			await createGame(game);
			imported++;
		}
		return {
			success: true,
			imported,
			skipped: parsed.skipped,
			duplicates,
			coverFailures
		};
	},

	updateAppearance: async ({ request }) => {
		const form = await request.formData();
		const siteTitle = String(form.get('siteTitle') ?? '').trim();
		const heroHeadline = String(form.get('heroHeadline') ?? '').trim();
		const accentColor = String(form.get('accentColor') ?? '').trim();
		const backgroundColor = String(form.get('backgroundColor') ?? '').trim();

		if (!isValidHexColor(accentColor) || !isValidHexColor(backgroundColor)) {
			return fail(400, { error: 'Farben müssen im Format #rrggbb angegeben werden.' });
		}

		await updateAppearance({
			siteTitle: siteTitle || null,
			heroHeadline: heroHeadline || null,
			accentColor,
			backgroundColor
		});
		return { success: true, appearanceSaved: true };
	},

	changePassword: async ({ request }) => {
		const form = await request.formData();
		const currentPassword = String(form.get('currentPassword') ?? '');
		const newPassword = String(form.get('newPassword') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');

		const adminUsername = await getEffectiveAdminUsername();
		if (!adminUsername) return fail(500, { error: 'Admin-Konto ist nicht konfiguriert.' });
		if (newPassword.length < 8) {
			return fail(400, { error: 'Neues Passwort muss mindestens 8 Zeichen haben.' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Passwörter stimmen nicht überein.' });
		}

		const valid = await verifyAdminCredentials(adminUsername, currentPassword);
		if (!valid) return fail(400, { error: 'Aktuelles Passwort ist falsch.' });

		const hash = await argon2.hash(newPassword);
		// Writes both fields — matters for env-configured deployments too, since
		// getAdminCredentials()/isAdminConfigured() require the DB to have both
		// adminUsername and adminPasswordHash before it takes over from .env.
		await createAdminAccount(adminUsername, hash);
		return { success: true, passwordChanged: true };
	},

	logout: async ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		throw redirect(303, '/login');
	}
};
