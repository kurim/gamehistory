<script lang="ts">
	import { enhance } from '$app/forms';
	import { versioned } from '$lib/cacheBust';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Login — {data.settings.siteTitle}</title>
</svelte:head>

<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-6">
	<div
		class="pointer-events-none absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-accent-600/30 to-accent-400/5 blur-3xl"
		aria-hidden="true"
	></div>

	<div
		class="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#12101d]/80 p-8 shadow-2xl backdrop-blur-xl"
	>
		<img src={versioned('/logo-512.png', data.appVersion)} alt="" class="mx-auto mb-4 h-14 w-14" />
		<h1 class="mb-6 text-center text-xl font-bold text-[#f4f2fa]">Admin-Login</h1>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			{#if form?.error}
				<p class="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
					{form.error}
				</p>
			{/if}

			<div>
				<label for="username" class="mb-1 block text-sm text-[#9c97ad]">Benutzername</label>
				<input
					id="username"
					name="username"
					type="text"
					autocomplete="username"
					required
					value={form?.username ?? ''}
					class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
				/>
			</div>

			<div>
				<label for="password" class="mb-1 block text-sm text-[#9c97ad]">Passwort</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="w-full rounded-lg border border-white/[0.08] bg-canvas px-3 py-2 text-[#f4f2fa] outline-none focus:border-accent-400/50"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full cursor-pointer rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{loading ? 'Anmelden…' : 'Anmelden'}
			</button>
		</form>
	</div>
</div>
