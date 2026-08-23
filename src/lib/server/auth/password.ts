import argon2 from 'argon2';
import { env } from '$env/dynamic/private';
import { getAdminPasswordHash } from '$lib/server/db/settings';

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
	if (!env.ADMIN_USER) {
		throw new Error('ADMIN_USER is not set');
	}
	if (username !== env.ADMIN_USER) return false;

	// A password changed via the admin UI lives in the DB (raw argon2 hash) and
	// takes priority; otherwise fall back to the .env hash (base64-encoded so
	// its '$'-delimited segments survive dotenv's variable expansion).
	const dbHash = await getAdminPasswordHash();
	if (dbHash) {
		try {
			return await argon2.verify(dbHash, password);
		} catch {
			return false;
		}
	}

	if (!env.ADMIN_PASSWORD_HASH) {
		throw new Error('ADMIN_PASSWORD_HASH is not set');
	}
	try {
		const hash = Buffer.from(env.ADMIN_PASSWORD_HASH, 'base64').toString('utf8');
		return await argon2.verify(hash, password);
	} catch {
		return false;
	}
}
