<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';

	let {
		categories,
		initial = {},
		action = '',
		submitLabel = 'Speichern',
		error = null
	}: {
		categories: string[];
		initial?: {
			name?: string;
			year?: number;
			category?: string;
			coverUrl?: string | null;
			coverLicense?: string | null;
			gameId?: number | null;
			wikipediaUrl?: string | null;
			description?: string | null;
		};
		action?: string;
		submitLabel?: string;
		error?: string | null;
	} = $props();

	let loading = $state(false);

	// Seeded once from `initial` when the form mounts — the fields are then
	// user-editable local state, not meant to track later prop changes.
	let coverUrl = $state(untrack(() => initial.coverUrl) ?? '');
	let coverLicense = $state(untrack(() => initial.coverLicense) ?? '');
	let resolvedGameId = $state(untrack(() => initial.gameId) ?? null);
	let sgdbGameId = $state(untrack(() => (initial.gameId ? String(initial.gameId) : '')));
	let sgdbLoading = $state(false);
	let sgdbError = $state<string | null>(null);

	function onCoverUrlInput() {
		resolvedGameId = null;
	}

	let coverFileInput = $state<HTMLInputElement | undefined>(undefined);
	let uploadPreviewUrl = $state<string | null>(null);

	function onCoverFileChange() {
		if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
		const file = coverFileInput?.files?.[0];
		uploadPreviewUrl = file ? URL.createObjectURL(file) : null;
		if (uploadPreviewUrl) resolvedGameId = null;
	}

	function clearCoverFile() {
		if (coverFileInput) coverFileInput.value = '';
		onCoverFileChange();
	}

	async function fetchFromSteamGridDb() {
		const gameId = Number(sgdbGameId);
		if (!Number.isInteger(gameId) || gameId <= 0) {
			sgdbError = 'Bitte eine gültige SteamGridDB-Game-ID eingeben.';
			return;
		}

		sgdbLoading = true;
		sgdbError = null;
		try {
			const res = await fetch('/admin/api/steamgriddb', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ gameId })
			});
			const body = await res.json();
			if (!res.ok) {
				sgdbError = body.error ?? 'Cover konnte nicht geladen werden.';
				return;
			}
			coverUrl = body.coverUrl;
			coverLicense = body.coverLicense;
			resolvedGameId = gameId;
			clearCoverFile();
		} catch {
			sgdbError = 'Netzwerkfehler beim Laden des Covers.';
		} finally {
			sgdbLoading = false;
		}
	}
</script>

<form
	method="POST"
	{action}
	enctype="multipart/form-data"
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	}}
	class="grid gap-3 sm:grid-cols-2"
>
	{#if error}
		<p
			class="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 sm:col-span-2"
		>
			{error}
		</p>
	{/if}

	<div class="sm:col-span-2">
		<label for="name" class="mb-1 block text-sm text-[#9c97ad]">Name *</label>
		<input
			id="name"
			name="name"
			type="text"
			required
			value={initial.name ?? ''}
			class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
		/>
	</div>

	<div>
		<label for="year" class="mb-1 block text-sm text-[#9c97ad]">Jahr *</label>
		<input
			id="year"
			name="year"
			type="number"
			required
			value={initial.year ?? ''}
			class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
		/>
	</div>

	<div>
		<label for="category" class="mb-1 block text-sm text-[#9c97ad]">Kategorie *</label>
		<input
			id="category"
			name="category"
			type="text"
			list="category-options"
			required
			value={initial.category ?? ''}
			class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
		/>
		<datalist id="category-options">
			{#each categories as category (category)}
				<option value={category}></option>
			{/each}
		</datalist>
	</div>

	<div class="flex gap-4 sm:col-span-2">
		<div
			class="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03]"
		>
			{#if uploadPreviewUrl}
				<img
					src={uploadPreviewUrl}
					alt="Cover-Vorschau"
					class="absolute inset-0 h-full w-full object-cover"
				/>
			{:else if coverUrl}
				<img
					src={coverUrl}
					alt="Cover-Vorschau"
					class="absolute inset-0 h-full w-full object-cover"
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

		<div class="flex-1 space-y-3">
			<div>
				<label for="sgdbGameId" class="mb-1 block text-sm text-[#9c97ad]">SteamGridDB Game-ID</label
				>
				<div class="flex gap-2">
					<input
						id="sgdbGameId"
						type="number"
						bind:value={sgdbGameId}
						placeholder="z. B. 12345"
						class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
					/>
					<button
						type="button"
						disabled={sgdbLoading}
						onclick={fetchFromSteamGridDb}
						class="shrink-0 rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-[#f4f2fa] hover:border-accent-400/30 hover:text-accent-200 disabled:opacity-50"
					>
						{sgdbLoading ? 'Lädt…' : 'Cover laden'}
					</button>
				</div>
				{#if sgdbError}
					<p class="mt-1 text-sm text-red-300">{sgdbError}</p>
				{/if}
			</div>

			<div>
				<label for="coverFile" class="mb-1 block text-sm text-[#9c97ad]"
					>Cover hochladen (PNG/JPEG/WebP)</label
				>
				<div class="flex gap-2">
					<input
						bind:this={coverFileInput}
						onchange={onCoverFileChange}
						id="coverFile"
						name="coverFile"
						type="file"
						accept="image/png,image/jpeg,image/webp"
						class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-sm text-[#f4f2fa] outline-none file:mr-3 file:rounded-md file:border-0 file:bg-accent-500/20 file:px-3 file:py-1 file:text-accent-200 focus:border-accent-400/50"
					/>
					{#if uploadPreviewUrl}
						<button
							type="button"
							onclick={clearCoverFile}
							class="shrink-0 rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-[#9c97ad] hover:text-[#f4f2fa]"
						>
							Zurücksetzen
						</button>
					{/if}
				</div>
				{#if uploadPreviewUrl}
					<p class="mt-1 text-sm text-[#9c97ad]">
						Hochgeladene Datei ersetzt die Cover-URL beim Speichern.
					</p>
				{/if}
			</div>
		</div>
	</div>

	<input type="hidden" name="gameId" value={resolvedGameId ?? ''} />

	<div>
		<label for="coverUrl" class="mb-1 block text-sm text-[#9c97ad]">Cover-URL</label>
		<input
			id="coverUrl"
			name="coverUrl"
			type="text"
			bind:value={coverUrl}
			oninput={onCoverUrlInput}
			class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
		/>
	</div>

	<div>
		<label for="coverLicense" class="mb-1 block text-sm text-[#9c97ad]">Cover-Lizenz</label>
		<input
			id="coverLicense"
			name="coverLicense"
			type="text"
			bind:value={coverLicense}
			class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
		/>
	</div>

	<div class="sm:col-span-2">
		<label for="wikipediaUrl" class="mb-1 block text-sm text-[#9c97ad]">Wikipedia-URL</label>
		<input
			id="wikipediaUrl"
			name="wikipediaUrl"
			type="url"
			value={initial.wikipediaUrl ?? ''}
			class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
		/>
	</div>

	<div class="sm:col-span-2">
		<label for="description" class="mb-1 block text-sm text-[#9c97ad]">Beschreibung</label>
		<textarea
			id="description"
			name="description"
			rows="3"
			class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
			>{initial.description ?? ''}</textarea
		>
	</div>

	<div class="sm:col-span-2">
		<button
			type="submit"
			disabled={loading}
			class="rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 px-5 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
		>
			{loading ? 'Speichern…' : submitLabel}
		</button>
	</div>
</form>
