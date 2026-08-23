import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from './$types';
import { COVERS_DIR } from '$lib/server/covers';

const EXT_TO_MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp'
};

const FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/;

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.filename;
	if (!filename || !FILENAME_PATTERN.test(filename)) {
		throw error(400, 'Ungültiger Dateiname.');
	}

	const ext = filename.split('.').pop()!.toLowerCase();

	let bytes: Buffer;
	try {
		bytes = await readFile(path.join(COVERS_DIR, filename));
	} catch {
		throw error(404, 'Cover nicht gefunden.');
	}

	return new Response(new Uint8Array(bytes), {
		headers: {
			'content-type': EXT_TO_MIME[ext] ?? 'application/octet-stream',
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
