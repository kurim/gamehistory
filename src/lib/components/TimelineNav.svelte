<script lang="ts">
	type DecadeNav = {
		decade: number;
		label: string;
		count: number;
		expandable: boolean;
		years: { year: number; count: number }[];
	};

	let { decades }: { decades: DecadeNav[] } = $props();

	let activeDecade = $state<number | null>(null);
	let openDecade = $state<number | null>(null);
	let mobileOpen = $state(false);

	function scrollToDecade(decade: number) {
		document
			.getElementById(`decade-${decade}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		openDecade = null;
		mobileOpen = false;
	}

	function scrollToYear(year: number) {
		document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		openDecade = null;
		mobileOpen = false;
	}

	$effect(() => {
		const sections = decades
			.map((d) => document.getElementById(`decade-${d.decade}`))
			.filter((el): el is HTMLElement => el !== null);

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const decade = Number(entry.target.getAttribute('data-decade'));
						activeDecade = decade;
					}
				}
			},
			{ rootMargin: '-15% 0px -70% 0px', threshold: 0 }
		);

		for (const section of sections) observer.observe(section);
		return () => observer.disconnect();
	});
</script>

<!-- Desktop: sticky floating pill nav -->
<nav
	class="sticky top-4 z-30 mx-auto hidden w-fit max-w-[92vw] flex-wrap items-center justify-center gap-1 rounded-full border border-white/[0.08] bg-[#12101d]/80 px-2 py-2 shadow-[0_0_40px_rgba(124,58,237,0.08)] backdrop-blur-xl md:flex"
	aria-label="Jahrzehnt-Navigation"
>
	{#each decades as d (d.decade)}
		<div
			class="relative"
			onmouseenter={() => d.expandable && (openDecade = d.decade)}
			onmouseleave={() => d.expandable && (openDecade = null)}
			role="none"
		>
			<button
				type="button"
				class="cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors {activeDecade ===
				d.decade
					? 'bg-accent-500/20 text-accent-200'
					: 'text-[#9c97ad] hover:bg-white/5 hover:text-[#f4f2fa]'}"
				onclick={() => scrollToDecade(d.decade)}
			>
				{d.label}
				<span class="ml-1 text-xs text-[#6b6678]">{d.count}</span>
			</button>

			{#if d.expandable && openDecade === d.decade}
				<!-- Wrapper touches the button with zero gap (padding, not margin) so the
					 hoverable area is continuous and the dropdown doesn't vanish while
					 moving the mouse down into it. -->
				<div class="absolute top-full left-1/2 z-40 w-40 -translate-x-1/2 pt-2">
					<div
						class="max-h-64 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#12101d] p-1.5 shadow-2xl"
					>
						<button
							type="button"
							class="mb-1 w-full cursor-pointer rounded-lg px-3 py-1.5 text-left text-xs text-[#9c97ad] hover:bg-white/5 hover:text-[#f4f2fa]"
							onclick={() => scrollToDecade(d.decade)}
						>
							Ganzes Jahrzehnt
						</button>
						{#each d.years as y (y.year)}
							<button
								type="button"
								class="w-full cursor-pointer rounded-lg px-3 py-1.5 text-left text-sm text-[#f4f2fa] hover:bg-accent-500/15"
								onclick={() => scrollToYear(y.year)}
							>
								{y.year}
								<span class="ml-1 text-xs text-[#6b6678]">{y.count}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</nav>

<!-- Mobile: dropdown sheet -->
<div class="sticky top-4 z-30 mx-4 md:hidden">
	<button
		type="button"
		class="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-white/[0.08] bg-[#12101d]/90 px-4 py-3 text-sm font-medium text-[#f4f2fa] shadow-lg backdrop-blur-xl"
		onclick={() => (mobileOpen = !mobileOpen)}
	>
		<span>{decades.find((d) => d.decade === activeDecade)?.label ?? 'Jahrzehnte'}</span>
		<span class="text-[#9c97ad]">{mobileOpen ? '▲' : '▼'}</span>
	</button>

	{#if mobileOpen}
		<div
			class="mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#12101d] p-2 shadow-2xl"
		>
			{#each decades as d (d.decade)}
				<button
					type="button"
					class="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-[#f4f2fa] hover:bg-accent-500/15"
					onclick={() => scrollToDecade(d.decade)}
				>
					{d.label} <span class="text-xs text-[#6b6678]">{d.count}</span>
				</button>
				{#if d.expandable}
					<div class="ml-3 border-l border-white/[0.08] pl-2">
						{#each d.years as y (y.year)}
							<button
								type="button"
								class="w-full cursor-pointer rounded-lg px-3 py-1.5 text-left text-sm text-[#9c97ad] hover:bg-white/5 hover:text-[#f4f2fa]"
								onclick={() => scrollToYear(y.year)}
							>
								{y.year} <span class="text-xs text-[#6b6678]">{y.count}</span>
							</button>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
