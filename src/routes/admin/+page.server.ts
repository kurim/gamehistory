import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createGame,
	deleteGame,
	listCategories,
	listGamesForImportMerge,
	listGamesNewestFirst,
	updateGame
} from '$lib/server/db/queries';
import { parseGameFormData, parseGameLookupJson } from '$lib/server/validation';
import { SESSION_COOKIE } from '$lib/server/auth/session';
import { CoverUploadError, saveUploadedCover } from '$lib/server/covers';
import {
	downloadCandidate,
	downloadGridForGame,
	type CoverCandidate
} from '$lib/server/steamgriddb';
import { downloadSteamCdnImage } from '$lib/server/steamCdnImage';
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

		// Set by the JSON-import cover preview step (client fetched candidates via
		// /admin/api/import-preview and the admin picked one, or explicitly "kein
		// Cover") — keyed by index into parsed.games. A missing entry means the
		// preview step wasn't used for that game (e.g. no gameId, already had a
		// coverUrl, or the client skipped preview entirely), so it falls back to
		// the old automatic top-1 pick below.
		let coverSelections: Record<string, CoverCandidate | null> = {};
		const selectionsRaw = form.get('coverSelections');
		if (typeof selectionsRaw === 'string' && selectionsRaw.trim()) {
			try {
				coverSelections = JSON.parse(selectionsRaw);
			} catch {
				// malformed selections — ignore and fall back to automatic behavior
			}
		}

		const dedupeKey = (name: string, year: number) => `${name.trim().toLowerCase()}::${year}`;
		type MergeRecord = Awaited<ReturnType<typeof listGamesForImportMerge>>[number];
		const existingByKey = new Map<string, MergeRecord>(
			(await listGamesForImportMerge()).map((g) => [dedupeKey(g.name, g.year), g])
		);

		let imported = 0;
		let updated = 0;
		let unchanged = 0;
		let coverFailures = 0;
		for (const [index, game] of parsed.games.entries()) {
			const key = dedupeKey(game.name, game.year);
			const existingGame = existingByKey.get(key);

			const steamCdnImageUrl = parsed.gameCoverCandidates[index];
			const filenameHint = () => String(game.steamAppId ?? `${game.name}-${index}`);

			if (existingGame) {
				// Only fill fields that are currently empty in the DB — never
				// overwrite a value already set (incl. by manual admin edits).
				const patch: Partial<MergeRecord> = {};
				if (!existingGame.wikipediaUrl && game.wikipediaUrl) {
					patch.wikipediaUrl = game.wikipediaUrl;
				}
				if (!existingGame.steamAppId && game.steamAppId) {
					patch.steamAppId = game.steamAppId;
				}
				if (!existingGame.gogSlug && game.gogSlug) {
					patch.gogSlug = game.gogSlug;
				}
				if (!existingGame.description && game.description) {
					patch.description = game.description;
				}

				if (!existingGame.coverUrl && !existingGame.gameId) {
					const selection = coverSelections[String(index)];
					if (!game.coverUrl && selection !== undefined) {
						if (selection) {
							try {
								const resolved =
									selection.source === 'steam'
										? await downloadSteamCdnImage(selection.url, filenameHint())
										: await downloadCandidate(game.gameId!, selection);
								patch.coverUrl = resolved.coverUrl;
								patch.coverLicense = resolved.coverLicense;
								if (selection.source !== 'steam') patch.gameId = game.gameId;
							} catch {
								coverFailures++;
							}
						}
					} else if (game.gameId && !game.coverUrl) {
						try {
							const resolved = await downloadGridForGame(game.gameId);
							patch.coverUrl = resolved.coverUrl;
							patch.coverLicense = resolved.coverLicense;
							patch.gameId = game.gameId;
						} catch {
							coverFailures++;
						}
					} else if (game.coverUrl) {
						patch.coverUrl = game.coverUrl;
						if (game.coverLicense) patch.coverLicense = game.coverLicense;
					} else if (steamCdnImageUrl) {
						try {
							const resolved = await downloadSteamCdnImage(steamCdnImageUrl, filenameHint());
							patch.coverUrl = resolved.coverUrl;
							patch.coverLicense = resolved.coverLicense;
						} catch {
							coverFailures++;
						}
					}
				}

				if (Object.keys(patch).length > 0) {
					await updateGame(existingGame.id, patch);
					Object.assign(existingGame, patch);
					updated++;
				} else {
					unchanged++;
				}
				continue;
			}

			const selection = coverSelections[String(index)];
			if (!game.coverUrl && selection !== undefined) {
				if (selection) {
					try {
						const resolved =
							selection.source === 'steam'
								? await downloadSteamCdnImage(selection.url, filenameHint())
								: await downloadCandidate(game.gameId!, selection);
						game.coverUrl = resolved.coverUrl;
						game.coverLicense = resolved.coverLicense;
					} catch {
						coverFailures++;
						game.coverUrl = null;
						game.coverLicense = null;
						if (selection.source !== 'steam') game.gameId = null;
					}
				} else {
					// admin explicitly picked "kein Cover" in the preview step
					game.coverUrl = null;
					game.coverLicense = null;
					game.gameId = null;
				}
			} else if (game.gameId && !game.coverUrl) {
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
			} else if (steamCdnImageUrl && !game.coverUrl) {
				try {
					const resolved = await downloadSteamCdnImage(steamCdnImageUrl, filenameHint());
					game.coverUrl = resolved.coverUrl;
					game.coverLicense = resolved.coverLicense;
				} catch {
					coverFailures++;
				}
			}
			const created = await createGame(game);
			existingByKey.set(key, {
				id: created.id,
				name: created.name,
				year: created.year,
				coverUrl: created.coverUrl,
				coverLicense: created.coverLicense,
				gameId: created.gameId,
				wikipediaUrl: created.wikipediaUrl,
				steamAppId: created.steamAppId,
				gogSlug: created.gogSlug,
				description: created.description
			});
			imported++;
		}

		// Partial-update-only entries (just `name` + one or more fields, no
		// year/category) patch an existing game matched by title — used to
		// bulk-fill a single field (e.g. steamAppId) across already-imported
		// games without re-supplying everything else.
		let partialUpdated = 0;
		let partialUnchanged = 0;
		let partialNotFound = 0;
		let partialAmbiguous = 0;
		if (parsed.partialUpdates.length > 0) {
			const byName = new Map<string, MergeRecord[]>();
			for (const g of existingByKey.values()) {
				const nameKey = g.name.trim().toLowerCase();
				const list = byName.get(nameKey);
				if (list) list.push(g);
				else byName.set(nameKey, [g]);
			}

			for (const [index, update] of parsed.partialUpdates.entries()) {
				const matches = byName.get(update.name.trim().toLowerCase()) ?? [];
				if (matches.length === 0) {
					partialNotFound++;
					continue;
				}
				if (matches.length > 1) {
					// Same title, multiple years in the DB — can't tell which one
					// the update is meant for, so skip rather than guess.
					partialAmbiguous++;
					continue;
				}
				const existingGame = matches[0];
				const patch: Partial<MergeRecord> = {};
				if (!existingGame.wikipediaUrl && update.wikipediaUrl) {
					patch.wikipediaUrl = update.wikipediaUrl;
				}
				if (!existingGame.steamAppId && update.steamAppId) {
					patch.steamAppId = update.steamAppId;
				}
				if (!existingGame.gogSlug && update.gogSlug) {
					patch.gogSlug = update.gogSlug;
				}
				if (!existingGame.description && update.description) {
					patch.description = update.description;
				}
				if (!existingGame.coverUrl && !existingGame.gameId) {
					const steamCdnImageUrl = parsed.partialUpdateCoverCandidates[index];
					const filenameHint = String(update.steamAppId ?? `${update.name}-${index}`);
					if (update.gameId) {
						try {
							const resolved = await downloadGridForGame(update.gameId);
							patch.coverUrl = resolved.coverUrl;
							patch.coverLicense = resolved.coverLicense;
							patch.gameId = update.gameId;
						} catch {
							coverFailures++;
						}
					} else if (update.coverUrl) {
						patch.coverUrl = update.coverUrl;
						if (update.coverLicense) patch.coverLicense = update.coverLicense;
					} else if (steamCdnImageUrl) {
						try {
							const resolved = await downloadSteamCdnImage(steamCdnImageUrl, filenameHint);
							patch.coverUrl = resolved.coverUrl;
							patch.coverLicense = resolved.coverLicense;
						} catch {
							coverFailures++;
						}
					}
				}

				if (Object.keys(patch).length > 0) {
					await updateGame(existingGame.id, patch);
					Object.assign(existingGame, patch);
					partialUpdated++;
				} else {
					partialUnchanged++;
				}
			}
		}

		return {
			success: true,
			imported,
			skipped: parsed.skipped,
			updated,
			unchanged,
			partialUpdated,
			partialUnchanged,
			partialNotFound,
			partialAmbiguous,
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
