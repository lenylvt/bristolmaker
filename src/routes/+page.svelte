<script lang="ts">
	import BristolSheet from '$lib/components/bristol/BristolSheet.svelte';
	import WorkspaceMenu from '$lib/components/workspace/WorkspaceMenu.svelte';
	import SelectionFormatPill from '$lib/components/format/SelectionFormatPill.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { MAX_SHEETS } from '$lib/sheet/count.js';
	import { addSheet, removeSheet } from '$lib/sheet/workbook.js';
	import { createDebouncedWorkspaceSave } from '$lib/storage/debounced-workspace-save.js';
	import {
		exportWorkspaceFile,
		isValidWorkspaceFile,
		readWorkspaceFile
	} from '$lib/storage/workspace-io.js';
	import {
		createDefaultWorkspace,
		loadWorkspaceFromStorage
	} from '$lib/storage/workspace.js';
	import { setActiveSheetKey } from '$lib/state/active-sheet.js';
	import { zoomFromWheel } from '$lib/viewport/pan-zoom.js';
	import { type SheetData, type WriteZone } from '$lib/zone/index.js';
	import { Plus } from '@lucide/svelte';
	import { onMount, tick } from 'svelte';

	let sheets = $state<SheetData[]>(createDefaultWorkspace());
	let scale = $state(1);
	let activeEditor = $state<HTMLElement | null>(null);
	let storageReady = $state(false);
	let importInputEl = $state<HTMLInputElement | null>(null);

	const debouncedSave = createDebouncedWorkspaceSave(300);

	onMount(() => {
		const stored = loadWorkspaceFromStorage();
		if (stored) sheets = stored;
		storageReady = true;

		return () => {
			debouncedSave.dispose();
		};
	});

	$effect(() => {
		if (!storageReady) return;
		debouncedSave.schedule(sheets);
	});

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

	function createNewWorkspace() {
		sheets = createDefaultWorkspace();
		activeEditor = null;
		debouncedSave.flush(sheets);
	}

	function exportWorkspace() {
		debouncedSave.flush(sheets);
		exportWorkspaceFile(sheets);
	}

	function openImportPicker() {
		importInputEl?.click();
	}

	async function handleImportFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || !isValidWorkspaceFile(file)) return;

		const imported = await readWorkspaceFile(file);
		if (!imported) return;

		sheets = imported;
		activeEditor = null;
		debouncedSave.flush(sheets);
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
			<WorkspaceMenu
				onprint={printSheets}
				onnew={createNewWorkspace}
				onimport={openImportPicker}
				onexport={exportWorkspace}
			/>
			<input
				bind:this={importInputEl}
				type="file"
				accept="application/json,.json"
				class="sr-only"
				aria-hidden="true"
				tabindex="-1"
				onchange={handleImportFile}
			/>
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
							<div
								class="sheet-slot"
								id="sheet-{sheet.id}"
								role="group"
								aria-label="Feuille {index + 1}"
								onpointerdown={() => setActiveSheetKey(sheet.id)}
							>
								<BristolSheet
									bind:sheet={sheets[index]}
									sheetKey={sheet.id}
									viewportScale={scale}
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

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
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
