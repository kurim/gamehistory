import { saveCoverImage } from '$lib/server/covers';

export class SteamCdnImageError extends Error {}

const EXT_FROM_CONTENT_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

function extFromUrl(url: string): string | null {
	const match = url.match(/\.(jpe?g|png|webp)(?:\?|$)/i);
	return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : null;
}

/**
 * Only ever download images from Steam's own store-asset CDN, never an
 * arbitrary client-supplied host — mirrors the SteamGridDB host check, since
 * this URL comes straight from JSON-import input. Also used by validation.ts
 * to decide whether an `Image` field is worth surfacing as a candidate at all.
 */
export function isTrustedSteamCdnUrl(url: string): boolean {
	try {
		const hostname = new URL(url).hostname;
		return hostname.endsWith('.steamstatic.com') || hostname.endsWith('.akamaihd.net');
	} catch {
		return false;
	}
}

/**
 * Downloads a Steam store CDN cover image — the `Image` field some
 * game-lookup JSON entries carry (a direct `library_600x900_2x.jpg`-style
 * asset URL) — to disk, alongside the SteamGridDB/IGDB candidates.
 */
export async function downloadSteamCdnImage(
	url: string,
	filenameHint: string
): Promise<{ coverUrl: string; coverLicense: string }> {
	if (!isTrustedSteamCdnUrl(url)) {
		throw new SteamCdnImageError('Ungültige Bild-URL.');
	}

	const imageResponse = await fetch(url);
	if (!imageResponse.ok) {
		throw new SteamCdnImageError(`Bild konnte nicht heruntergeladen werden (${url}).`);
	}
	const bytes = Buffer.from(await imageResponse.arrayBuffer());
	const contentType = imageResponse.headers.get('content-type')?.split(';')[0]?.trim();
	const ext = (contentType && EXT_FROM_CONTENT_TYPE[contentType]) ?? extFromUrl(url) ?? 'jpg';

	const coverUrl = await saveCoverImage(bytes, ext, `steam-${filenameHint}`);
	return { coverUrl, coverLicense: 'Steam-Store-CDN' };
}
