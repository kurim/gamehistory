import type { LayoutServerLoad } from './$types';
import { getSettings } from '$lib/server/db/settings';
import { appVersion } from '$lib/server/version';

export const load: LayoutServerLoad = async () => {
	const settings = await getSettings();
	return { settings, appVersion };
};
