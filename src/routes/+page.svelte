<script lang="ts">
	import { resolve } from '$app/paths';
	import TimelineNav from '$lib/components/TimelineNav.svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import BackToTop from '$lib/components/BackToTop.svelte';

	let { data } = $props();

	let selectedCategory = $state<string | null>(null);
	let searchQuery = $state('');

	function toggleCategory(category: string) {
		selectedCategory = selectedCategory === category ? null : category;
	}

	let normalizedQuery = $derived(searchQuery.trim().toLowerCase());

	let filteredDecades = $derived(
		selectedCategory === null && normalizedQuery === ''
			? data.decades
			: data.decades
					.map((d) => {
						const years = d.years
							.map((y) => ({
								...y,
								games: y.games.filter(
									(g) =>
										(selectedCategory === null || g.category === selectedCategory) &&
										(normalizedQuery === '' || g.name.toLowerCase().includes(normalizedQuery))
								)
							}))
							.filter((y) => y.games.length > 0);
						const count = years.reduce((sum, y) => sum + y.games.length, 0);
						return { ...d, years, count, expandable: count > 8 };
					})
					.filter((d) => d.years.length > 0)
	);
</script>

<svelte:head>
	<title>{data.settings.siteTitle}</title>
</svelte:head>

<div class="min-h-screen bg-canvas text-[#f4f2fa]">
	<!-- Hero -->
	<header class="relative px-6 pt-10 pb-6 text-center">
		<h1 class="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
			<span class="bg-gradient-to-r from-accent-400 to-accent-200 bg-clip-text text-transparent"
				>{data.settings.heroHeadline}</span
			>
		</h1>

		<div class="mx-auto mt-8 max-w-sm">
			<label class="relative block">
				<span class="sr-only">Spiele durchsuchen</span>
				<svg
					class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6b6678]"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" />
					<path stroke-linecap="round" d="m20 20-3.5-3.5" />
				</svg>
				<input
					type="search"
					bind:value={searchQuery}
					placeholder="Spiele durchsuchen…"
					class="w-full rounded-full border border-white/[0.08] bg-[#12101d]/70 py-2 pr-4 pl-9 text-sm text-[#f4f2fa] backdrop-blur-md transition-colors placeholder:text-[#6b6678] focus:border-accent-400/40 focus:outline-none"
				/>
			</label>
		</div>

		{#if data.categoryStats.length > 0}
			<div class="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
				{#each data.categoryStats as stat (stat.category)}
					<button
						type="button"
						onclick={() => toggleCategory(stat.category)}
						class="cursor-pointer rounded-full border px-3 py-1 text-sm backdrop-blur-md transition-colors {selectedCategory ===
						stat.category
							? 'border-accent-400/50 bg-accent-500/25 text-accent-100'
							: 'border-white/[0.08] bg-[#12101d]/70 text-[#9c97ad] hover:border-accent-400/30 hover:text-[#f4f2fa]'}"
					>
						<span class={selectedCategory === stat.category ? '' : 'text-[#f4f2fa]'}
							>{stat.category}</span
						>
						· {stat.count}
					</button>
				{/each}
				{#if selectedCategory !== null}
					<button
						type="button"
						onclick={() => (selectedCategory = null)}
						class="cursor-pointer rounded-full border border-white/[0.08] px-3 py-1 text-sm text-[#6b6678] hover:text-[#f4f2fa]"
					>
						Filter zurücksetzen ✕
					</button>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Decorative "CRT boot" portal, continuing the timeline downward -->
	<div class="relative mx-auto mb-2 h-28 max-w-xs" aria-hidden="true">
		<div
			class="glow-crt absolute top-0 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-gradient-to-b from-accent-600/40 to-accent-400/10 blur-3xl"
		></div>
		<div
			class="absolute top-2 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border border-accent-300/20"
		>
			<img
				src="/logo-512.png"
				alt=""
				class="-mt-1.5 h-[74px] w-[74px] max-w-none shrink-0 object-cover"
			/>
		</div>
		<div
			class="absolute top-[4.5rem] left-1/2 h-10 w-px -translate-x-1/2 bg-gradient-to-b from-accent-400/40 to-transparent"
		></div>
	</div>

	{#if data.decades.length === 0}
		<p class="mx-auto max-w-md px-6 py-24 text-center text-[#9c97ad]">
			Noch keine Spiele erfasst. Trag welche im <a
				href={resolve('/admin')}
				class="text-accent-300 underline">Admin-Bereich</a
			>
			ein.
		</p>
	{:else}
		<TimelineNav decades={filteredDecades} />

		{#if filteredDecades.length === 0}
			<p class="mx-auto max-w-md px-6 py-24 text-center text-[#9c97ad]">
				{normalizedQuery !== ''
					? `Keine Spiele gefunden für „${searchQuery.trim()}“.`
					: 'Keine Spiele in dieser Kategorie.'}
			</p>
		{:else}
			<!-- Timeline body -->
			<main class="mx-auto max-w-[96rem] px-6 py-12">
				{#each filteredDecades as d (d.decade)}
					<section
						id="decade-{d.decade}"
						data-decade={d.decade}
						class="scroll-mt-24 pt-10 first:pt-0"
					>
						<h2 class="mb-6 flex items-baseline gap-2 border-b border-white/[0.08] pb-3">
							<span class="text-2xl font-bold text-[#f4f2fa]">{d.label}</span>
							<span class="text-sm text-[#6b6678]">{d.count} Spiele</span>
						</h2>

						{#each d.years as y (y.year)}
							<div id="year-{y.year}" class="scroll-mt-24 pb-8">
								<h3 class="mb-3 text-sm font-semibold tracking-wide text-accent-300/80 uppercase">
									{y.year}
								</h3>
								<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
									{#each y.games as game (game.id)}
										<GameCard {game} />
									{/each}
								</div>
							</div>
						{/each}
					</section>
				{/each}
			</main>
		{/if}
	{/if}

	<footer class="px-6 py-10 text-center">
		<a
			href={resolve('/admin')}
			class="text-xs text-[#6b6678] transition-colors hover:text-accent-300"
		>
			Admin
		</a>
		<p class="mt-2 text-xs text-[#6b6678]/60">{data.appVersion}</p>
	</footer>
</div>

<BackToTop />

<style>
	@media (prefers-reduced-motion: no-preference) {
		.glow-crt {
			animation: pulse-glow 6s ease-in-out infinite;
		}
	}

	@keyframes pulse-glow {
		0%,
		100% {
			opacity: 0.75;
			transform: translateX(-50%) scale(1);
		}
		50% {
			opacity: 1;
			transform: translateX(-50%) scale(1.06);
		}
	}
</style>
