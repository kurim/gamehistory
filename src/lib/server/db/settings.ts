import { eq } from 'drizzle-orm';
import { db } from './index';
import { settings } from './schema';
import {
	DEFAULT_ACCENT_COLOR,
	DEFAULT_BACKGROUND_COLOR,
	DEFAULT_HERO_HEADLINE,
	DEFAULT_SITE_TITLE,
	isValidHexColor
} from '$lib/theme';

const SETTINGS_ID = 1;

export type ResolvedSettings = {
	siteTitle: string;
	heroHeadline: string;
	accentColor: string;
	backgroundColor: string;
};

export async function getSettings(): Promise<ResolvedSettings> {
	const [row] = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID));
	const accentColor =
		row?.accentColor && isValidHexColor(row.accentColor) ? row.accentColor : DEFAULT_ACCENT_COLOR;
	const backgroundColor =
		row?.backgroundColor && isValidHexColor(row.backgroundColor)
			? row.backgroundColor
			: DEFAULT_BACKGROUND_COLOR;

	return {
		siteTitle: row?.siteTitle || DEFAULT_SITE_TITLE,
		heroHeadline: row?.heroHeadline || DEFAULT_HERO_HEADLINE,
		accentColor,
		backgroundColor
	};
}

/** Both fields must be set — a lone leftover hash without a username doesn't count as configured. */
export async function getAdminCredentials(): Promise<{ username: string; hash: string } | null> {
	const [row] = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID));
	if (row?.adminUsername && row?.adminPasswordHash) {
		return { username: row.adminUsername, hash: row.adminPasswordHash };
	}
	return null;
}

/** Creates the admin account on first run — see the `/setup` route. */
export async function createAdminAccount(username: string, hash: string): Promise<void> {
	await ensureRow();
	await db
		.update(settings)
		.set({ adminUsername: username, adminPasswordHash: hash })
		.where(eq(settings.id, SETTINGS_ID));
}

async function ensureRow() {
	const [row] = await db
		.select({ id: settings.id })
		.from(settings)
		.where(eq(settings.id, SETTINGS_ID));
	if (!row) {
		await db.insert(settings).values({ id: SETTINGS_ID });
	}
}

export async function updateAppearance(data: {
	siteTitle: string | null;
	heroHeadline: string | null;
	accentColor: string | null;
	backgroundColor: string | null;
}): Promise<void> {
	await ensureRow();
	await db.update(settings).set(data).where(eq(settings.id, SETTINGS_ID));
}
