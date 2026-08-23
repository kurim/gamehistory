import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyAdminCredentials } from '$lib/server/auth/password';
import { createSessionToken, SESSION_COOKIE, SESSION_DURATION } from '$lib/server/auth/session';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/admin');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { error: 'Bitte Benutzername und Passwort eingeben.', username });
		}

		let valid: boolean;
		try {
			valid = await verifyAdminCredentials(username, password);
		} catch {
			return fail(500, { error: 'Server-Konfiguration unvollständig.', username });
		}

		if (!valid) {
			return fail(400, { error: 'Benutzername oder Passwort ist falsch.', username });
		}

		const token = await createSessionToken(username);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: SESSION_DURATION
		});

		const redirectTo = url.searchParams.get('redirectTo');
		throw redirect(303, redirectTo && redirectTo.startsWith('/') ? redirectTo : '/admin');
	}
};
