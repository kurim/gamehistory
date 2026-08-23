<script lang="ts">
	import { resolve } from '$app/paths';
	import GameForm from '$lib/components/GameForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Spiel bearbeiten — {data.game.name}</title>
</svelte:head>

<div class="min-h-screen bg-canvas px-6 py-12 text-[#f4f2fa]">
	<div class="mx-auto max-w-2xl">
		<a
			href={resolve('/admin')}
			class="mb-6 inline-block text-sm text-[#9c97ad] hover:text-accent-300"
			>← Zurück zur Übersicht</a
		>
		<h1 class="mb-6 text-2xl font-bold">{data.game.name} bearbeiten</h1>

		<div class="rounded-2xl border border-white/[0.08] bg-[#12101d]/70 p-6 backdrop-blur-md">
			<GameForm
				categories={data.categories}
				initial={data.game}
				submitLabel="Änderungen speichern"
				error={form?.error ?? null}
			/>
		</div>
	</div>
</div>
