<script lang="ts">
	import BristolSheet from '$lib/components/bristol/BristolSheet.svelte';
	import WorkspaceMenu from '$lib/components/workspace/WorkspaceMenu.svelte';
	import SelectionFormatPill from '$lib/components/format/SelectionFormatPill.svelte';
	import {
		buildContinuousLayout,
		computeContinuousPageCount,
		mergeSheetsToContinuous,
		migrateZonesToCompactLayout,
		PRINT_EXTRA_SIDE_MARGIN_CM
	} from '$lib/bristol/continuous.js';
	import { buildBristolLayout } from '$lib/bristol/layout.js';
	import { computePrintPageCount, mapSheetForPrint, slicePrintSheetPage } from '$lib/bristol/print-map.js';
	import { createDebouncedWorkspaceSave } from '$lib/storage/debounced-workspace-save.js';
	import {
		exportWorkspaceFile,
		isValidWorkspaceFile,
		readWorkspaceFile
	} from '$lib/storage/workspace-io.js';
	import {
		createDefaultWorkspace,
		loadWorkspaceFromStorage,
		normalizeSheet
	} from '$lib/storage/workspace.js';
	import { zoomFromWheel } from '$lib/viewport/pan-zoom.js';
	import { type SheetData } from '$lib/zone/index.js';
	import { onMount } from 'svelte';

	function normalizeContinuousWorkspace(sheets: SheetData[]): SheetData {
		if (sheets.length === 0) return createDefaultWorkspace()[0];
		if (sheets.length === 1) return normalizeSheet(sheets[0]);
		return normalizeSheet(mergeSheetsToContinuous(sheets.map(normalizeSheet)));
	}

	let sheet = $state<SheetData>(normalizeContinuousWorkspace(createDefaultWorkspace()));
	let scale = $state(1);
	let activeEditor = $state<HTMLElement | null>(null);
	let storageReady = $state(false);
	let importInputEl = $state<HTMLInputElement | null>(null);

	const baseLayout = buildBristolLayout();
	const editorPageCount = $derived(computeContinuousPageCount(sheet.zones));
	const printSheet = $derived(mapSheetForPrint(sheet, buildContinuousLayout(editorPageCount)));
	const printPageCount = $derived(computePrintPageCount(printSheet));
	const printPageHeightCm = baseLayout.specs.heightCm;
	const printPageWidthCm = baseLayout.specs.widthCm;

	const debouncedSave = createDebouncedWorkspaceSave(300);

	onMount(() => {
		const stored = loadWorkspaceFromStorage();
		if (stored) sheet = normalizeContinuousWorkspace(stored);
		storageReady = true;

		return () => {
			debouncedSave.dispose();
		};
	});

	$effect(() => {
		if (!storageReady) return;
		debouncedSave.schedule([sheet]);
	});

	function handleEditorFocus(editor: HTMLElement) {
		activeEditor = editor;
	}

	function printSheets() {
		window.print();
	}

	function createNewWorkspace() {
		sheet = normalizeContinuousWorkspace(createDefaultWorkspace());
		activeEditor = null;
		debouncedSave.flush([sheet]);
	}

	function exportWorkspace() {
		debouncedSave.flush([sheet]);
		exportWorkspaceFile([sheet]);
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

		sheet = normalizeContinuousWorkspace(imported);
		activeEditor = null;
		debouncedSave.flush([sheet]);
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
					<div class="sheet-slot" id="sheet-{sheet.id}" role="group" aria-label="Document Bristol">
						<BristolSheet
							bind:sheet
							sheetKey={sheet.id}
							viewportScale={scale}
							continuous
							oneditorfocus={handleEditorFocus}
						/>
					</div>
				</div>
			</div>
		</div>
	</main>

	<SelectionFormatPill editor={activeEditor} />

	<div
		class="print-sheets"
		aria-hidden="true"
		style:--print-content-width="{printPageWidthCm}cm"
		style:--print-page-height="{printPageHeightCm}cm"
		style:--print-side-margin="{PRINT_EXTRA_SIDE_MARGIN_CM}cm"
	>
		{#each Array(printPageCount) as _, pageIndex (pageIndex)}
			<div class="print-page-clip">
				<BristolSheet
					sheet={slicePrintSheetPage(printSheet, pageIndex)}
					editable={false}
					class="print-clip-child"
				/>
			</div>
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
	}

	.sheet-slot {
		display: flex;
		justify-content: center;
	}

	.print-sheets {
		display: none;
	}

	.print-page-clip {
		width: var(--print-content-width);
		height: var(--print-page-height);
		overflow: hidden;
		margin: 0 auto;
		padding: 0 var(--print-side-margin);
		box-sizing: content-box;
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

		.print-page-clip {
			page-break-after: always;
			break-after: page;
		}

		.print-page-clip:last-child {
			page-break-after: auto;
			break-after: auto;
		}
	}

	@page {
		size: 148mm 210mm;
		margin: 0;
	}
</style>
