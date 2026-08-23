import argon2 from 'argon2';
import { env } from '$env/dynamic/private';
import { getAdminCredentials } from '$lib/server/db/settings';

/**
 * Legacy fallback for deployments that still provision credentials via
 * .env (base64-encoded so the '$'-delimited hash survives dotenv's
 * variable expansion) instead of the `/setup` first-run wizard.
 */
function envCredentials(): { username: string; hash: string } | null {
	if (!env.ADMIN_USER || !env.ADMIN_PASSWORD_HASH) return null;
	return {
		username: env.ADMIN_USER,
		hash: Buffer.from(env.ADMIN_PASSWORD_HASH, 'base64').toString('utf8')
	};
}

/** True once an admin account exists — via `/setup` (DB) or legacy .env vars. */
export async function isAdminConfigured(): Promise<boolean> {
	if (await getAdminCredentials()) return true;
	return envCredentials() !== null;
}

/** The username to authenticate against — DB takes priority over .env. */
export async function getEffectiveAdminUsername(): Promise<string | null> {
	const dbCreds = await getAdminCredentials();
	if (dbCreds) return dbCreds.username;
	return envCredentials()?.username ?? null;
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
	const creds = (await getAdminCredentials()) ?? envCredentials();
	if (!creds) return false;
	if (username !== creds.username) return false;

	try {
		return await argon2.verify(creds.hash, password);
	} catch {
		return false;
	}
}
