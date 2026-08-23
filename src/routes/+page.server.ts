import type { PageServerLoad } from './$types';
import { listGamesChronological } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	const allGames = await listGamesChronological();

	const categoryCounts = new Map<string, number>();
	for (const game of allGames) {
		categoryCounts.set(game.category, (categoryCounts.get(game.category) ?? 0) + 1);
	}
	const categoryStats = [...categoryCounts.entries()]
		.map(([category, count]) => ({ category, count }))
		.sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

	const decadeMap = new Map<number, Map<number, typeof allGames>>();
	for (const game of allGames) {
		const decade = Math.floor(game.year / 10) * 10;
		if (!decadeMap.has(decade)) decadeMap.set(decade, new Map());
		const yearMap = decadeMap.get(decade)!;
		if (!yearMap.has(game.year)) yearMap.set(game.year, []);
		yearMap.get(game.year)!.push(game);
	}

	const decades = [...decadeMap.entries()]
		.sort(([a], [b]) => a - b)
		.map(([decade, yearMap]) => {
			const years = [...yearMap.entries()]
				.sort(([a], [b]) => a - b)
				.map(([year, games]) => ({ year, games, count: games.length }));
			const count = years.reduce((sum, y) => sum + y.count, 0);
			return {
				decade,
				label: `${decade}er`,
				count,
				expandable: count > 8,
				years
			};
		});

	return { categoryStats, decades, totalGames: allGames.length };
};
