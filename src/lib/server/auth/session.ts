import { SignJWT, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';

const SESSION_COOKIE = 'session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 Tage

function getSecretKey() {
	if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
	return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function createSessionToken(username: string): Promise<string> {
	return new SignJWT({ sub: username })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_DURATION}s`)
		.sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<{ username: string } | null> {
	try {
		const { payload } = await jwtVerify(token, getSecretKey());
		if (typeof payload.sub !== 'string') return null;
		return { username: payload.sub };
	} catch {
		return null;
	}
}

export { SESSION_COOKIE, SESSION_DURATION };
