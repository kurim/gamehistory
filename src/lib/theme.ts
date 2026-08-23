export const DEFAULT_ACCENT_COLOR = '#7c3aed';
export const DEFAULT_BACKGROUND_COLOR = '#08060f';
export const DEFAULT_SITE_TITLE = 'Gaming-Zeitstrahl';
export const DEFAULT_HERO_HEADLINE = "Kurim's Gaming-Geschichte";

function hexToRgb(hex: string): [number, number, number] {
	const clean = hex.replace('#', '');
	const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
	const num = parseInt(full, 16);
	return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			default:
				h = (r - g) / d + 4;
		}
		h /= 6;
	}
	return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
	s /= 100;
	l /= 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	const toHex = (n: number) =>
		Math.round(f(n) * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

/** Derives a Tailwind-violet-like 200/300/400/500/600 shade ramp from a single accent color. */
export function deriveAccentShades(baseHex: string): {
	100: string;
	200: string;
	300: string;
	400: string;
	500: string;
	600: string;
} {
	const [r, g, b] = hexToRgb(baseHex);
	const [h, s] = rgbToHsl(r, g, b);
	return {
		100: hslToHex(h, Math.max(s, 55), 93),
		200: hslToHex(h, Math.max(s, 60), 87),
		300: hslToHex(h, Math.max(s, 65), 78),
		400: hslToHex(h, Math.max(s, 70), 68),
		500: hslToHex(h, Math.max(s, 70), 58),
		600: hslToHex(h, s, 48)
	};
}

export function isValidHexColor(value: string): boolean {
	return /^#[0-9a-fA-F]{6}$/.test(value);
}
