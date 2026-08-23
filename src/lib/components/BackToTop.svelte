<script lang="ts">
	let visible = $state(false);

	$effect(() => {
		function onScroll() {
			visible = window.scrollY > 600;
		}
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function scrollToTop() {
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
	}
</script>

{#if visible}
	<button
		type="button"
		onclick={scrollToTop}
		aria-label="Nach oben scrollen"
		class="fixed right-5 bottom-5 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-[#12101d]/90 text-[#9c97ad] shadow-[0_0_30px_rgba(124,58,237,0.15)] backdrop-blur-xl transition-colors hover:border-accent-400/30 hover:text-accent-200"
	>
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5M5 12l7-7 7 7" />
		</svg>
	</button>
{/if}
