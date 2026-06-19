<script lang="ts">
	import { FileDown, FileUp, FilePlus, EllipsisVertical, Printer } from '@lucide/svelte';
	import { onMount } from 'svelte';

	type Props = {
		onprint?: () => void;
		onnew?: () => void;
		onimport?: () => void;
		onexport?: () => void;
	};

	let { onprint, onnew, onimport, onexport }: Props = $props();

	let rootEl = $state<HTMLElement | null>(null);
	let menuOpen = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}

	function runAction(action?: () => void) {
		action?.();
		closeMenu();
	}

	function handleDocumentPointerDown(event: PointerEvent) {
		if (!menuOpen || !rootEl) return;
		if (rootEl.contains(event.target as Node)) return;
		closeMenu();
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (!menuOpen) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			closeMenu();
		}
	}

	onMount(() => {
		document.addEventListener('pointerdown', handleDocumentPointerDown);
		document.addEventListener('keydown', handleDocumentKeydown);
		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown);
			document.removeEventListener('keydown', handleDocumentKeydown);
		};
	});
</script>

<div class="workspace-menu" bind:this={rootEl}>
	<div
		class="workspace-menu-card t-resize"
		class:is-open={menuOpen}
		role="menu"
		aria-label="Actions Bristol"
	>
		<button
			type="button"
			class="workspace-menu-trigger"
			aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu Bristol'}
			aria-expanded={menuOpen}
			onclick={toggleMenu}
		>
			<EllipsisVertical size={15} strokeWidth={2} />
		</button>

		<div class="workspace-menu-body" aria-hidden={!menuOpen}>
			<button type="button" class="workspace-menu-item" role="menuitem" tabindex={menuOpen ? 0 : -1} onclick={() => runAction(onprint)}>
				<Printer size={14} strokeWidth={2} />
				Imprimer
			</button>
			<div class="workspace-menu-divider" role="separator"></div>
			<button type="button" class="workspace-menu-item" role="menuitem" tabindex={menuOpen ? 0 : -1} onclick={() => runAction(onnew)}>
				<FilePlus size={14} strokeWidth={2} />
				Nouveau
			</button>
			<div class="workspace-menu-divider" role="separator"></div>
			<button
				type="button"
				class="workspace-menu-item"
				role="menuitem"
				tabindex={menuOpen ? 0 : -1}
				onclick={() => runAction(onimport)}
			>
				<FileUp size={14} strokeWidth={2} />
				Importer
			</button>
			<button
				type="button"
				class="workspace-menu-item"
				role="menuitem"
				tabindex={menuOpen ? 0 : -1}
				onclick={() => runAction(onexport)}
			>
				<FileDown size={14} strokeWidth={2} />
				Exporter
			</button>
		</div>
	</div>
</div>

<style>
	.workspace-menu {
		position: relative;
		z-index: 50;
		flex-shrink: 0;
		width: 1.75rem;
		height: 1.75rem;
	}

	.workspace-menu-card {
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		width: 1.75rem;
		height: 1.75rem;
		overflow: hidden;
		border: 1px solid oklch(0.88 0 0);
		border-radius: 0.4375rem;
		background: white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
	}

	.workspace-menu-card.is-open {
		width: 11.5rem;
		height: 12.25rem;
		border-radius: 0.75rem;
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.1);
	}

	.workspace-menu-trigger {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: none;
		background: transparent;
		color: oklch(0.35 0 0);
		cursor: pointer;
		transition: background var(--ui-press-dur) var(--ui-press-ease);
	}

	.workspace-menu-trigger:hover {
		background: oklch(0.96 0 0);
	}

	.workspace-menu-trigger:focus-visible {
		outline: 2px solid oklch(0.72 0 0);
		outline-offset: -2px;
	}

	.workspace-menu-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--resize-dur) var(--resize-ease);
	}

	.workspace-menu-card.is-open .workspace-menu-body {
		opacity: 1;
		pointer-events: auto;
	}

	.workspace-menu-item {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: none;
		background: transparent;
		color: oklch(0.25 0 0);
		font-size: 0.875rem;
		line-height: 1.25rem;
		text-align: left;
		cursor: pointer;
		transition: background var(--ui-press-dur) var(--ui-press-ease);
	}

	.workspace-menu-item :global(svg) {
		flex-shrink: 0;
	}

	.workspace-menu-item:hover {
		background: oklch(0.96 0 0);
	}

	.workspace-menu-item:focus-visible {
		outline: 2px solid oklch(0.72 0 0);
		outline-offset: -2px;
	}

	.workspace-menu-divider {
		flex-shrink: 0;
		height: 1px;
		margin: 0.125rem 0;
		background: oklch(0.92 0 0);
	}

	@media (prefers-reduced-motion: reduce) {
		.workspace-menu-body {
			transition: none !important;
		}
	}
</style>
