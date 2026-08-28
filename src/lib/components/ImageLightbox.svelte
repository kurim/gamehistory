<script lang="ts">
	let {
		src,
		alt,
		open,
		onClose
	}: {
		src: string | null;
		alt: string;
		open: boolean;
		onClose: () => void;
	} = $props();

	let dialogEl = $state<HTMLDialogElement | undefined>(undefined);

	$effect(() => {
		if (open) dialogEl?.showModal();
		else dialogEl?.close();
	});
</script>

<dialog
	bind:this={dialogEl}
	onclose={onClose}
	onclick={(e) => {
		if (e.target === dialogEl) dialogEl?.close();
	}}
	class="m-auto max-w-[90vw] rounded-2xl border border-white/[0.08] bg-[#12101d] p-2 backdrop:bg-black/70"
>
	{#if open && src}
		<img {src} {alt} class="max-h-[85vh] max-w-full rounded-lg object-contain" />
	{/if}
</dialog>

<style>
	dialog::backdrop {
		backdrop-filter: blur(4px);
	}
</style>
