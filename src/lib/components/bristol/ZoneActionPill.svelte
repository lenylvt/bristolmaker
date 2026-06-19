<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Copy, Layers, Unlink } from '@lucide/svelte';

	type PillMode = 'multi' | 'block';

	type Props = {
		anchor?: { top: number; left: number } | null;
		mode?: PillMode | null;
		oncreateblock?: () => void;
		onunblock?: () => void;
		onduplicate?: () => void;
	};

	let {
		anchor = null,
		mode = null,
		oncreateblock,
		onunblock,
		onduplicate
	}: Props = $props();

	const visible = $derived(anchor !== null && mode !== null);
</script>

{#if visible && anchor}
	<div
		class="zone-action-pill no-print"
		role="toolbar"
		aria-label="Actions sur la sélection"
		style:top="{anchor.top}px"
		style:left="{anchor.left}px"
	>
		{#if mode === 'multi'}
			<Button variant="secondary" size="sm" class="pill-btn" onclick={oncreateblock}>
				<Layers />
				Créer un block
			</Button>
		{:else if mode === 'block'}
			<Button variant="secondary" size="sm" class="pill-btn" onclick={onduplicate}>
				<Copy />
				Dupliquer
			</Button>
			<Button variant="outline" size="sm" class="pill-btn" onclick={onunblock}>
				<Unlink />
				Débloquer
			</Button>
		{/if}
	</div>
{/if}

<style>
	.zone-action-pill {
		position: fixed;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem;
		border: 1px solid oklch(0.9 0 0);
		border-radius: 9999px;
		background: white;
		box-shadow: 0 4px 16px rgb(0 0 0 / 0.1);
		transform: translate(-50%, calc(-100% - 0.75rem));
		pointer-events: auto;
	}

	:global(.pill-btn) {
		border-radius: 9999px;
		gap: 0.35rem;
	}
</style>
