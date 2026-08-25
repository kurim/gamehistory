/**
 * Appends the app version as a cache-busting query param to a static asset
 * path (icons, logo — files under `static/` that keep the same filename
 * across deploys). Browsers otherwise happily keep serving a stale cached
 * copy after the underlying file changes, since nothing about the URL
 * changed. Not meant for game covers etc., which already get unique,
 * content-addressed filenames on upload/download.
 */
export function versioned(path: string, appVersion: string): string {
	return `${path}?v=${encodeURIComponent(appVersion)}`;
}
