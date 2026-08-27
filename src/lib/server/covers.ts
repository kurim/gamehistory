import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const COVERS_DIR = path.resolve('data/covers');
const THUMBS_DIR = path.join(COVERS_DIR, '.thumbs');

/**
 * Widths the app actually requests cover thumbnails at (grid cards render
 * covers at 82px CSS width — 200px covers a 2x/retina display with margin).
 * Kept as a fixed allowlist rather than an arbitrary query param so the
 * on-disk thumbnail cache can't be inflated by requesting arbitrary sizes.
 */
export const ALLOWED_THUMB_WIDTHS = [200] as const;
export type ThumbWidth = (typeof ALLOWED_THUMB_WIDTHS)[number];

/**
 * Resizes a stored cover down to `width` (height auto, aspect preserved) and
 * caches the result as webp under data/covers/.thumbs/ — covers are
 * otherwise stored and served at their original resolution, which wastes
 * bandwidth and load time for the small grid thumbnails. Returns `null` if
 * the source cover doesn't exist.
 */
export async function getCoverThumbnail(
	filename: string,
	width: ThumbWidth
): Promise<{ bytes: Buffer; mime: string } | null> {
	const thumbPath = path.join(THUMBS_DIR, `${width}-${filename}.webp`);
	try {
		return { bytes: await readFile(thumbPath), mime: 'image/webp' };
	} catch {
		// not cached yet — fall through and generate it
	}

	let original: Buffer;
	try {
		original = await readFile(path.join(COVERS_DIR, filename));
	} catch {
		return null;
	}

	const bytes = await sharp(original)
		.resize({ width, withoutEnlargement: true })
		.webp({ quality: 80 })
		.toBuffer();
	await mkdir(THUMBS_DIR, { recursive: true });
	await writeFile(thumbPath, bytes);
	return { bytes, mime: 'image/webp' };
}

const MIME_TO_EXT: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp'
};

export function extFromMime(mime: string): string | null {
	return MIME_TO_EXT[mime] ?? null;
}

/** Saves image bytes under data/covers/ and returns the public `/covers/...` URL. */
export async function saveCoverImage(
	bytes: Buffer,
	ext: string,
	filenameBase: string
): Promise<string> {
	await mkdir(COVERS_DIR, { recursive: true });
	const filename = `${filenameBase}.${ext}`;
	await writeFile(path.join(COVERS_DIR, filename), bytes);
	return `/covers/${filename}`;
}

export class CoverUploadError extends Error {}

/** Saves a user-uploaded cover image (from a multipart form field). */
export async function saveUploadedCover(file: File): Promise<string> {
	const ext = extFromMime(file.type);
	if (!ext) {
		throw new CoverUploadError('Nur PNG-, JPEG- oder WebP-Bilder werden unterstützt.');
	}
	const bytes = Buffer.from(await file.arrayBuffer());
	return saveCoverImage(bytes, ext, `upload-${crypto.randomUUID()}`);
}
