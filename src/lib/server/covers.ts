import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const COVERS_DIR = path.resolve('data/covers');

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
