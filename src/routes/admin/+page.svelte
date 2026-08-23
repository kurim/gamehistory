<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import GameForm from '$lib/components/GameForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let sortDir = $state<'asc' | 'desc'>('desc');
	let filterCategory = $state('');
	let sortedGames = $derived(
		(filterCategory === ''
			? data.games
			: data.games.filter((g) => g.category === filterCategory)
		).sort((a, b) => (sortDir === 'asc' ? a.year - b.year : b.year - a.year))
	);

	type Tab = 'import' | 'add' | 'list' | 'settings';
	let activeTab = $state<Tab>('list');

	let jsonImportLoading = $state(false);

	// Seeded once from `data.settings` — user-editable local state afterward.
	let siteTitle = $state(untrack(() => data.settings.siteTitle));
	let heroHeadline = $state(untrack(() => data.settings.heroHeadline));
	let accentColor = $state(untrack(() => data.settings.accentColor));
	let backgroundColor = $state(untrack(() => data.settings.backgroundColor));
	let appearanceLoading = $state(false);
	let passwordLoading = $state(false);
</script>

<svelte:head>
	<title>Admin — {data.settings.siteTitle}</title>
</svelte:head>

<div class="min-h-screen bg-canvas px-6 py-10 text-[#f4f2fa]">
	<div class="mx-auto max-w-5xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-2xl font-bold">Admin</h1>
			<div class="flex items-center gap-3">
				<a href={resolve('/')} class="text-sm text-[#9c97ad] hover:text-accent-300"
					>Zeitstrahl ansehen</a
				>
				<form method="POST" action="?/logout" use:enhance>
					<button
						type="submit"
						class="cursor-pointer rounded-lg border border-white/[0.08] px-3 py-1.5 text-sm text-[#9c97ad] hover:border-red-400/30 hover:text-red-300"
					>
						Logout
					</button>
				</form>
			</div>
		</div>

		<!-- Top nav -->
		<nav
			class="mb-8 flex w-fit flex-wrap gap-1 rounded-full border border-white/[0.08] bg-[#12101d]/70 p-1"
		>
			<button
				type="button"
				onclick={() => (activeTab = 'import')}
				class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors {activeTab ===
				'import'
					? 'bg-accent-500/20 text-accent-200'
					: 'text-[#9c97ad] hover:text-[#f4f2fa]'}"
			>
				JSON-Import
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'add')}
				class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors {activeTab ===
				'add'
					? 'bg-accent-500/20 text-accent-200'
					: 'text-[#9c97ad] hover:text-[#f4f2fa]'}"
			>
				Spiel manuell hinzufügen
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'list')}
				class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors {activeTab ===
				'list'
					? 'bg-accent-500/20 text-accent-200'
					: 'text-[#9c97ad] hover:text-[#f4f2fa]'}"
			>
				Spieleliste
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'settings')}
				class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors {activeTab ===
				'settings'
					? 'bg-accent-500/20 text-accent-200'
					: 'text-[#9c97ad] hover:text-[#f4f2fa]'}"
			>
				Einstellungen
			</button>
		</nav>

		{#if form?.error}
			<p
				class="mb-6 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
			>
				{form.error}
			</p>
		{/if}
		{#if form?.success && 'imported' in form}
			<p
				class="mb-6 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
			>
				{form.imported} Spiel(e) importiert.{#if 'duplicates' in form && form.duplicates}
					{form.duplicates} Duplikat(e) übersprungen (Name + Jahr bereits vorhanden).
				{/if}{#if 'skipped' in form && form.skipped}
					{form.skipped} Eintrag/Einträge übersprungen (ungültig oder nicht auflösbar).
				{/if}{#if 'coverFailures' in form && form.coverFailures}
					{form.coverFailures} Cover konnten nicht von SteamGridDB geladen werden.
				{/if}
			</p>
		{/if}
		{#if form?.success && 'appearanceSaved' in form}
			<p
				class="mb-6 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
			>
				Darstellung gespeichert.
			</p>
		{/if}
		{#if form?.success && 'passwordChanged' in form}
			<p
				class="mb-6 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
			>
				Passwort geändert.
			</p>
		{/if}

		{#if activeTab === 'import'}
			<!-- JSON Import -->
			<section class="rounded-2xl border border-white/[0.08] bg-[#12101d]/70 p-6 backdrop-blur-md">
				<h2 class="mb-3 text-lg font-semibold">JSON-Import</h2>
				<p class="mb-3 text-sm text-[#9c97ad]">
					JSON aus dem <code class="text-accent-300">game-lookup</code>-Skill (ein Titel, liefert
					ein einzelnes Objekt) oder <code class="text-accent-300">game-lookups</code>-Skill
					(mehrere kommagetrennte Titel, liefert ein Array) einfügen — beide Formate werden
					unterstützt.
					<a
						href="/game-lookup.skill"
						download
						rel="external"
						class="text-accent-300 hover:underline">game-lookup herunterladen</a
					>
					·
					<a
						href="/game-lookups.skill"
						download
						rel="external"
						class="text-accent-300 hover:underline">game-lookups herunterladen</a
					>
				</p>
				<form
					method="POST"
					action="?/importJson"
					use:enhance={() => {
						jsonImportLoading = true;
						return async ({ update }) => {
							jsonImportLoading = false;
							await update();
						};
					}}
					class="space-y-3"
				>
					<textarea
						name="json"
						rows="8"
						placeholder={'{ "name": "...", "year": 2005, "category": "...", ... }\noder [{ ... }, { ... }]'}
						class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 font-mono text-sm text-[#f4f2fa] outline-none focus:border-accent-400/50"
						required></textarea>
					<button
						type="submit"
						disabled={jsonImportLoading}
						class="cursor-pointer rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 px-5 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						{jsonImportLoading ? 'Importiere…' : 'Importieren'}
					</button>
				</form>
			</section>
		{:else if activeTab === 'add'}
			<!-- Add game -->
			<section class="rounded-2xl border border-white/[0.08] bg-[#12101d]/70 p-6 backdrop-blur-md">
				<h2 class="mb-3 text-lg font-semibold">Spiel manuell hinzufügen</h2>
				<GameForm categories={data.categories} action="?/create" submitLabel="Spiel anlegen" />
			</section>
		{:else if activeTab === 'settings'}
			<!-- Settings -->
			<section class="rounded-2xl border border-white/[0.08] bg-[#12101d]/70 p-6 backdrop-blur-md">
				<div class="space-y-8">
					<form
						method="POST"
						action="?/updateAppearance"
						use:enhance={() => {
							appearanceLoading = true;
							return async ({ update }) => {
								appearanceLoading = false;
								await update();
							};
						}}
						class="grid gap-3 sm:grid-cols-2"
					>
						<h3 class="text-sm font-semibold text-[#9c97ad] sm:col-span-2">
							Titel &amp; Darstellung
						</h3>

						<div class="sm:col-span-2">
							<label for="siteTitle" class="mb-1 block text-sm text-[#9c97ad]">Seitentitel</label>
							<input
								id="siteTitle"
								name="siteTitle"
								type="text"
								bind:value={siteTitle}
								class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
							/>
						</div>

						<div class="sm:col-span-2">
							<label for="heroHeadline" class="mb-1 block text-sm text-[#9c97ad]">Headline</label>
							<input
								id="heroHeadline"
								name="heroHeadline"
								type="text"
								bind:value={heroHeadline}
								class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
							/>
						</div>

						<div>
							<label for="accentColor" class="mb-1 block text-sm text-[#9c97ad]">Akzentfarbe</label>
							<div class="flex items-center gap-2">
								<input
									id="accentColor"
									type="color"
									bind:value={accentColor}
									class="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/[0.08] bg-canvas p-1"
								/>
								<input
									type="text"
									name="accentColor"
									bind:value={accentColor}
									class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
								/>
							</div>
						</div>

						<div>
							<label for="backgroundColor" class="mb-1 block text-sm text-[#9c97ad]"
								>Hintergrundfarbe</label
							>
							<div class="flex items-center gap-2">
								<input
									id="backgroundColor"
									type="color"
									bind:value={backgroundColor}
									class="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/[0.08] bg-canvas p-1"
								/>
								<input
									type="text"
									name="backgroundColor"
									bind:value={backgroundColor}
									class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
								/>
							</div>
						</div>

						<div class="sm:col-span-2">
							<button
								type="submit"
								disabled={appearanceLoading}
								class="cursor-pointer rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 px-5 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
							>
								{appearanceLoading ? 'Speichern…' : 'Darstellung speichern'}
							</button>
						</div>
					</form>

					<form
						method="POST"
						action="?/changePassword"
						use:enhance={() => {
							passwordLoading = true;
							return async ({ update }) => {
								passwordLoading = false;
								await update();
							};
						}}
						class="grid gap-3 border-t border-white/[0.06] pt-6 sm:grid-cols-2"
					>
						<h3 class="text-sm font-semibold text-[#9c97ad] sm:col-span-2">Passwort ändern</h3>

						<div class="sm:col-span-2">
							<label for="currentPassword" class="mb-1 block text-sm text-[#9c97ad]"
								>Aktuelles Passwort</label
							>
							<input
								id="currentPassword"
								name="currentPassword"
								type="password"
								autocomplete="current-password"
								required
								class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
							/>
						</div>

						<div>
							<label for="newPassword" class="mb-1 block text-sm text-[#9c97ad]"
								>Neues Passwort</label
							>
							<input
								id="newPassword"
								name="newPassword"
								type="password"
								autocomplete="new-password"
								required
								minlength="8"
								class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
							/>
						</div>

						<div>
							<label for="confirmPassword" class="mb-1 block text-sm text-[#9c97ad]"
								>Neues Passwort bestätigen</label
							>
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								autocomplete="new-password"
								required
								minlength="8"
								class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
							/>
						</div>

						<div class="sm:col-span-2">
							<button
								type="submit"
								disabled={passwordLoading}
								class="cursor-pointer rounded-lg border border-white/[0.08] px-5 py-2 font-medium text-[#f4f2fa] transition-colors hover:border-accent-400/30 hover:text-accent-200 disabled:opacity-50"
							>
								{passwordLoading ? 'Ändern…' : 'Passwort ändern'}
							</button>
						</div>
					</form>
				</div>
			</section>
		{:else}
			<!-- Table -->
			<section class="rounded-2xl border border-white/[0.08] bg-[#12101d]/70 backdrop-blur-md">
				<div
					class="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] p-4"
				>
					<h2 class="text-lg font-semibold">
						Alle Spiele ({sortedGames.length}{filterCategory ? ` von ${data.games.length}` : ''})
					</h2>
					<div class="flex items-center gap-3">
						<select
							bind:value={filterCategory}
							class="cursor-pointer rounded-lg border border-white/[0.08] bg-canvas px-3 py-1.5 text-sm text-[#f4f2fa] outline-none focus:border-accent-400/50"
						>
							<option value="">Alle Kategorien</option>
							{#each data.categories as category (category)}
								<option value={category}>{category}</option>
							{/each}
						</select>
						<button
							type="button"
							class="cursor-pointer text-sm text-[#9c97ad] hover:text-accent-300"
							onclick={() => (sortDir = sortDir === 'asc' ? 'desc' : 'asc')}
						>
							Jahr sortieren ({sortDir === 'asc' ? 'aufsteigend' : 'absteigend'})
						</button>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="text-[#6b6678]">
								<th class="px-4 py-2 font-medium">Jahr</th>
								<th class="px-4 py-2 font-medium">Name</th>
								<th class="px-4 py-2 font-medium">Kategorie</th>
								<th class="px-4 py-2 font-medium"></th>
							</tr>
						</thead>
						<tbody>
							{#each sortedGames as game (game.id)}
								<tr class="border-t border-white/[0.06]">
									<td class="px-4 py-2 text-[#9c97ad] tabular-nums">{game.year}</td>
									<td class="px-4 py-2 font-medium text-[#f4f2fa]">{game.name}</td>
									<td class="px-4 py-2 text-[#9c97ad]">{game.category}</td>
									<td class="px-4 py-2 text-right whitespace-nowrap">
										<a
											href={resolve('/admin/games/[id]/edit', { id: String(game.id) })}
											class="mr-3 text-accent-300 hover:underline">Edit</a
										>
										<form method="POST" action="?/delete" use:enhance class="inline">
											<input type="hidden" name="id" value={game.id} />
											<button
												type="submit"
												class="cursor-pointer text-red-300 hover:underline"
												onclick={(e) => {
													if (!confirm(`"${game.name}" wirklich löschen?`)) e.preventDefault();
												}}
											>
												Delete
											</button>
										</form>
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="4" class="px-4 py-8 text-center text-[#6b6678]">
										{filterCategory
											? 'Keine Spiele in dieser Kategorie.'
											: 'Noch keine Spiele erfasst.'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
	</div>
</div>
