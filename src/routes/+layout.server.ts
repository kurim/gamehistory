import type { LayoutServerLoad } from './$types';
import { getSettings } from '$lib/server/db/settings';

export const load: LayoutServerLoad = async () => {
	const settings = await getSettings();
	return { settings };
};
