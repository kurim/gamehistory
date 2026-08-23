import argon2 from 'argon2';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdminConfigured } from '$lib/server/auth/password';
import { createAdminAccount } from '$lib/server/db/settings';
import { createSessionToken, SESSION_COOKIE, SESSION_DURATION } from '$lib/server/auth/session';

export const load: PageServerLoad = async () => {
	// hooks.server.ts already redirects here once configured, but guard
	// directly too in case this load ever runs outside that hook.
	if (await isAdminConfigured()) throw redirect(303, '/login');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		if (await isAdminConfigured()) throw redirect(303, '/login');

		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');

		if (!username) return fail(400, { error: 'Benutzername ist erforderlich.', username });
		if (password.length < 8) {
			return fail(400, { error: 'Passwort muss mindestens 8 Zeichen haben.', username });
		}
		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwörter stimmen nicht überein.', username });
		}

		const hash = await argon2.hash(password);
		await createAdminAccount(username, hash);

		const token = await createSessionToken(username);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: SESSION_DURATION
		});

		throw redirect(303, '/admin');
	}
};
