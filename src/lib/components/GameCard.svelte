<script lang="ts">
	import { page } from '$app/state';
	import type { Game } from '$lib/server/db/schema';
	import ImageLightbox from '$lib/components/ImageLightbox.svelte';
	import { versioned } from '$lib/cacheBust';
	import { coverThumbUrl } from '$lib/covers';

	let { game }: { game: Game } = $props();

	let coverOpen = $state(false);

	const links = $derived(
		[
			game.wikipediaUrl && { href: game.wikipediaUrl, label: 'Wikipedia', icon: '/wikipedia.svg' },
			game.gameId && {
				href: `https://www.steamgriddb.com/game/${game.gameId}`,
				label: 'SteamGridDB',
				icon: '/sgdb.svg'
			},
			game.steamAppId && {
				href: `https://store.steampowered.com/app/${game.steamAppId}/`,
				label: 'Steam',
				icon: '/steam.svg'
			},
			game.steamAppId && {
				href: `https://steamdb.info/app/${game.steamAppId}/`,
				label: 'SteamDB',
				icon: '/steamdb.svg'
			},
			game.gogSlug && {
				href: `https://www.gog.com/game/${game.gogSlug}`,
				label: 'GOG',
				icon: '/gog.svg'
			}
		].filter((l): l is { href: string; label: string; icon: string } => Boolean(l))
	);
</script>

<article
	class="group flex gap-4 rounded-2xl border border-white/[0.08] bg-[#12101d]/70 p-5 backdrop-blur-md transition-colors hover:border-accent-400/30"
>
	<div class="flex shrink-0 flex-col items-center gap-2">
		<button
			type="button"
			disabled={!game.coverUrl}
			onclick={() => (coverOpen = true)}
			class="relative h-[122px] w-[82px] shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03] {game.coverUrl
				? 'cursor-zoom-in'
				: 'cursor-default'}"
		>
			{#if game.coverUrl}
				<img
					src={coverThumbUrl(game.coverUrl)}
					alt="Cover von {game.name}"
					class="absolute inset-0 aspect-[2/3] object-cover"
					loading="lazy"
				/>
			{:else}
				<svg
					class="absolute inset-0 m-auto h-8 w-8 text-[#6b6678]"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 4.5h6a2 2 0 0 1 2 2V6h.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H7v-.5a2 2 0 0 1 2-2Z"
					/>
					<circle cx="9" cy="13" r="1.5" />
					<circle cx="15" cy="13" r="1.5" />
				</svg>
			{/if}
		</button>

		{#if links.length > 0}
			<div class="grid w-[82px] grid-cols-2 gap-1.5">
				{#each links as link (link.label)}
					<a
						href={link.href}
						target="_blank"
						rel="external noopener noreferrer"
						title={link.label}
						class="flex h-9 w-9 cursor-pointer items-center justify-center justify-self-center rounded-full border border-white/[0.08] transition-colors hover:border-accent-400/40 hover:bg-accent-500/10"
					>
						<img
							src={versioned(link.icon, page.data.appVersion)}
							alt={link.label}
							class="h-4 w-4 {link.icon === '/sgdb.svg' || link.icon === '/steam.svg'
								? ''
								: 'invert'}"
						/>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<div class="min-w-0 flex-1">
		<div class="mb-1 flex flex-wrap items-center gap-2">
			<span
				class="cursor-pointer rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-200 tabular-nums"
			>
				{game.year}
			</span>
			<span
				class="cursor-pointer rounded-full border border-white/[0.08] px-2 py-0.5 text-xs text-[#9c97ad]"
			>
				{game.category}
			</span>
		</div>
		<h3 class="text-base font-semibold text-[#f4f2fa]">{game.name}</h3>
		{#if game.description}
			<p class="mt-1 text-sm text-[#9c97ad]">{game.description}</p>
		{/if}
	</div>
</article>

<ImageLightbox
	src={game.coverUrl}
	alt="Cover von {game.name}"
	open={coverOpen}
	onClose={() => (coverOpen = false)}
/>
