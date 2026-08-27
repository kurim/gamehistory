/**
 * Points a game's cover at the small server-generated thumbnail instead of
 * the original-resolution file, for the ~82px-wide grid cards — cuts load
 * time and traffic on the timeline page, which can render dozens of covers
 * at once. Only applies to covers stored by this app (served from
 * `/covers/...`); an external URL (e.g. the Wikipedia-fallback cover path,
 * which stores a direct image URL instead of downloading it) is returned
 * unchanged since there's no local file to resize.
 */
export function coverThumbUrl(coverUrl: string): string {
	return coverUrl.startsWith('/covers/') ? `${coverUrl}?w=200` : coverUrl;
}
