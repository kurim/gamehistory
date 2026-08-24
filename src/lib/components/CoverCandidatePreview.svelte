<script lang="ts">
	type CoverCandidate = { id: number; url: string; mime: string; author: string | null };

	let {
		candidate,
		onSelect,
		onClose
	}: {
		candidate: CoverCandidate | null;
		onSelect: (candidate: CoverCandidate) => void;
		onClose: () => void;
	} = $props();

	let dialogEl = $state<HTMLDialogElement | undefined>(undefined);

	$effect(() => {
		if (candidate) dialogEl?.showModal();
		else dialogEl?.close();
	});
</script>

<dialog
	bind:this={dialogEl}
	onclose={onClose}
	onclick={(e) => {
		if (e.target === dialogEl) dialogEl?.close();
	}}
	class="m-auto rounded-2xl border border-white/[0.08] bg-[#12101d] p-5 text-[#f4f2fa] backdrop:bg-black/70"
>
	{#if candidate}
		<img
			src={candidate.url}
			alt="Cover-Vorschau"
			class="mx-auto aspect-[2/3] w-64 max-w-full rounded-lg object-cover"
		/>
		{#if candidate.author}
			<p class="mt-2 text-center text-xs text-[#6b6678]">von {candidate.author}</p>
		{/if}
		<div class="mt-4 flex justify-center gap-3">
			<button
				type="button"
				onclick={() => {
					onSelect(candidate);
					dialogEl?.close();
				}}
				class="cursor-pointer rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
			>
				Dieses Cover auswählen
			</button>
			<button
				type="button"
				onclick={() => dialogEl?.close()}
				class="cursor-pointer rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-[#9c97ad] hover:text-[#f4f2fa]"
			>
				Abbrechen
			</button>
		</div>
	{/if}
</dialog>

<style>
	dialog::backdrop {
		backdrop-filter: blur(4px);
	}
</style>
