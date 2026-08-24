<script lang="ts">
	import type { Game } from '$lib/server/db/schema';

	let { game }: { game: Game } = $props();
</script>

<article
	class="group flex gap-4 rounded-2xl border border-white/[0.08] bg-[#12101d]/70 p-5 backdrop-blur-md transition-colors hover:border-accent-400/30"
>
	<div
		class="relative h-[122px] w-[82px] shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03]"
	>
		{#if game.coverUrl}
			<img
				src={game.coverUrl}
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

		{#if game.wikipediaUrl || game.gameId}
			<div class="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
				{#if game.wikipediaUrl}
					<a
						href={game.wikipediaUrl}
						target="_blank"
						rel="external noopener noreferrer"
						class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-accent-300 underline decoration-accent-400/40 underline-offset-2 transition-colors hover:border-accent-400/40 hover:bg-accent-500/10 hover:text-accent-200"
					>
						<img src="/wikipedia.svg" alt="" class="h-4 w-4 invert" />
						Wikipedia
					</a>
				{/if}
				{#if game.gameId}
					<a
						href="https://www.steamgriddb.com/game/{game.gameId}"
						target="_blank"
						rel="external noopener noreferrer"
						class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-accent-300 underline decoration-accent-400/40 underline-offset-2 transition-colors hover:border-accent-400/40 hover:bg-accent-500/10 hover:text-accent-200"
					>
						<img src="/sgdb.svg" alt="" class="h-4 w-4 object-contain" />
						SteamGridDB
					</a>
				{/if}
			</div>
		{/if}
	</div>
</article>
