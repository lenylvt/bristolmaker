<script lang="ts">
	import BristolSheet from '$lib/components/bristol/BristolSheet.svelte';
	import SelectionFormatPill from '$lib/components/format/SelectionFormatPill.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { MAX_SHEETS } from '$lib/sheet/count.js';
	import { addSheet, removeSheet } from '$lib/sheet/workbook.js';
	import { zoomFromWheel } from '$lib/viewport/pan-zoom.js';
	import { createEmptySheet, type SheetData, type WriteZone } from '$lib/zone/index.js';
	import { Plus, Printer } from '@lucide/svelte';
	import { tick } from 'svelte';

	let sheets = $state<SheetData[]>([createEmptySheet()]);
	let scale = $state(1);
	let activeEditor = $state<HTMLElement | null>(null);

	const canAddSheet = $derived(sheets.length < MAX_SHEETS);

	function handleEditorFocus(editor: HTMLElement) {
		activeEditor = editor;
	}

	async function handleZoneOverflow(sheetId: string, continuation: WriteZone) {
		const sheetIndex = sheets.findIndex((sheet) => sheet.id === sheetId);
		if (sheetIndex === -1) return;

		let nextSheets = [...sheets];

		if (sheetIndex + 1 >= nextSheets.length) {
			if (nextSheets.length >= MAX_SHEETS) return;
			nextSheets = addSheet(nextSheets);
		}

		const targetSheet = nextSheets[sheetIndex + 1];
		nextSheets[sheetIndex + 1] = {
			...targetSheet,
			zones: [...targetSheet.zones, continuation]
		};
		sheets = nextSheets;

		await tick();
		const nextSheet = nextSheets[sheetIndex + 1];
		const nextEditor = document.querySelector<HTMLElement>(
			`#sheet-${nextSheet.id} [data-zone-id="${continuation.id}"] .zone-editor`
		);
		nextEditor?.focus();
	}

	function handleAddSheet() {
		sheets = addSheet(sheets);
	}

	function handleRemoveSheet(sheetId: string) {
		const index = sheets.findIndex((sheet) => sheet.id === sheetId);
		if (index === -1) return;
		sheets = removeSheet(sheets, index);
	}

	function printSheets() {
		window.print();
	}

	function handleWheel(event: WheelEvent) {
		if (!event.ctrlKey && !event.metaKey) return;
		event.preventDefault();
		scale = zoomFromWheel(scale, event.deltaY);
	}
</script>

<svelte:head>
	<title>Bristol</title>
</svelte:head>

<div class="app">
	<main class="workspace no-print">
		<header class="toolbar">
			<h1 class="title caveat-brand">Bristol</h1>
			<Button
				variant="outline"
				size="icon-sm"
				class="bg-white"
				aria-label="Imprimer"
				onclick={printSheets}
			>
				<Printer />
			</Button>
		</header>

		<div
			class="viewport"
			role="application"
			aria-label="Zone de travail Bristol"
			onwheel={handleWheel}
		>
			<div class="viewport-canvas" style:zoom={scale}>
				<div class="workspace-inner">
					<div class="sheets-stack">
						{#each sheets as sheet, index (sheet.id)}
							<div class="sheet-slot" id="sheet-{sheet.id}">
								<BristolSheet
									bind:sheet={sheets[index]}
									sheetKey={sheet.id}
									deletable={index > 0}
									ondelete={() => handleRemoveSheet(sheet.id)}
									oneditorfocus={handleEditorFocus}
									onzoneoverflow={({ continuation }) => handleZoneOverflow(sheet.id, continuation)}
								/>
							</div>
						{/each}
					</div>

					{#if canAddSheet}
						<Button
							variant="secondary"
							size="sm"
							class="rounded-full px-4 shadow-sm"
							onclick={handleAddSheet}
						>
							<Plus />
							Ajouter une feuille
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</main>

	<SelectionFormatPill editor={activeEditor} />

	<div class="print-sheets" aria-hidden="true">
		{#each sheets as sheet (sheet.id)}
			<BristolSheet {sheet} editable={false} />
		{/each}
	</div>
</div>

<style>
	.app {
		width: 100%;
		height: 100dvh;
		overflow: hidden;
	}

	.workspace {
		position: relative;
		width: 100%;
		height: 100%;
		background-color: oklch(0.93 0 0);
		background-image: radial-gradient(circle, oklch(0.82 0 0) 1px, transparent 1px);
		background-size: 22px 22px;
		color: var(--card-foreground);
	}

	.toolbar {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 1rem 1.25rem;
	}

	.caveat-brand {
		font-family: 'Caveat', cursive;
		font-optical-sizing: auto;
		font-weight: 600;
		font-style: normal;
		font-size: 2rem;
		line-height: 1;
		letter-spacing: 0.01em;
	}

	.viewport {
		height: 100%;
		overflow: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.viewport::-webkit-scrollbar {
		display: none;
	}

	.viewport-canvas {
		display: inline-flex;
		min-width: 100%;
		min-height: 100%;
		justify-content: center;
		padding: 4.5rem 2rem 2.5rem;
	}

	.workspace-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.sheets-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2.5rem;
	}

	.sheet-slot {
		display: flex;
		justify-content: center;
	}

	.print-sheets {
		display: none;
	}

	@media print {
		:global(body) {
			background: transparent !important;
			margin: 0 !important;
			overflow: visible !important;
		}

		:global(.no-print) {
			display: none !important;
		}

		.app {
			height: auto;
			overflow: visible;
		}

		.print-sheets {
			display: block;
		}
	}

	@page {
		size: 148mm 210mm;
		margin: 0;
	}
</style>
