import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySessionToken } from '$lib/server/auth/session';
import { getSettings } from '$lib/server/db/settings';
import { deriveAccentShades } from '$lib/theme';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? await verifySessionToken(token) : null;

	if (event.url.pathname.startsWith('/admin') && !event.locals.user) {
		const redirectTo = event.url.pathname + event.url.search;
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const settings = await getSettings();
	const shades = deriveAccentShades(settings.accentColor);
	const themeCss = `:root{--accent-100:${shades[100]};--accent-200:${shades[200]};--accent-300:${shades[300]};--accent-400:${shades[400]};--accent-500:${shades[500]};--accent-600:${shades[600]};--canvas:${settings.backgroundColor};}`;

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('</head>', `<style>${themeCss}</style></head>`)
	});
};
