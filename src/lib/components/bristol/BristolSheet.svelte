<script lang="ts">
	import WriteZoneBlock from '$lib/components/bristol/WriteZone.svelte';
	import ZoneActionPill from '$lib/components/bristol/ZoneActionPill.svelte';
	import { buildBristolLayout, getWritableArea, TEXT_OFFSET } from '$lib/bristol/layout.js';
	import {
		buildContinuousLayout,
		computeContinuousPageCount,
		getPageBreakPositions,
		PRINT_EXTRA_SIDE_MARGIN_CM,
		type ContinuousLayout
	} from '$lib/bristol/continuous.js';
	import {
		createBlockFromZoneIds,
		duplicateBlock,
		moveBlockZones,
		moveZonesByDelta,
		pasteZones,
		removeBlock,
		removeZonesFromBlocks
	} from '$lib/block/block.js';
	import { copyZonesToClipboard, readZonesFromClipboard } from '$lib/zone/clipboard.js';
	import {
		clientToSheetCm,
		createZoneAtPoint,
		createWriteZone,
		DEFAULT_ZONE_WIDTH_CM,
		findNextZonePlacement,
		getZoneTopCm,
		isZoneEmpty,
		measureEditorLineCount,
		MIN_ZONE_LINES,
		moveZoneByArrow,
		moveZoneWithGrab,
		resizeZone,
		type ResizeHandle,
		type SheetData,
		type WriteZone,
		type ZoneGeometry
	} from '$lib/zone/index.js';
	import {
		createContinuationZone,
		getZoneMaxLines,
		splitZoneEditorOverflow
	} from '$lib/overflow/index.js';
	import { sanitizeEditorHtml } from '$lib/editor/sanitize.js';
	import { isActiveSheetKey, setActiveSheetKey } from '$lib/state/active-sheet.js';
	import { resolveSheetKeyAction } from '$lib/state/sheet-keyboard-actions.js';
	import { registerSheetKeydown } from '$lib/state/sheet-keyboard.js';
	import {
		applyCreateBlockSelection,
		applyDuplicateBlockSelection,
		applyPasteSelection,
		blurZoneEdit,
		clearSelection,
		createEmptySelection,
		enterZoneEdit,
		getHighlightedZoneIds,
		getMoveGroupZoneIds,
		getPillMode,
		getPrimarySelectedZoneId,
		getSelectedZones,
		isEditingZone,
		isZoneBlockSelected,
		isZoneSelected,
		removeZoneFromSelection,
		selectSingleZone,
		selectZone,
		type SheetSelection
	} from '$lib/state/sheet-selection.js';
	import { trackSelectionAnchor } from '$lib/viewport/selection-anchor.js';
	import { tick } from 'svelte';

	type OverflowPayload = {
		zoneId: string;
		continuation: WriteZone;
	};

	type Props = {
		sheet?: SheetData;
		sheetKey?: string;
		viewportScale?: number;
		editable?: boolean;
		continuous?: boolean;
		deletable?: boolean;
		class?: string;
		onzoneoverflow?: (payload: OverflowPayload) => void;
		oneditorfocus?: (editor: HTMLElement) => void;
		ondelete?: () => void;
	};

	let {
		sheet = $bindable({ id: 'sheet-0', zones: [], blocks: [] }),
		sheetKey = 'sheet-0',
		viewportScale = 1,
		editable = true,
		continuous = false,
		deletable = false,
		class: className = '',
		onzoneoverflow,
		oneditorfocus,
		ondelete
	}: Props = $props();

	let sheetEl = $state<HTMLElement | null>(null);
	let selection = $state<SheetSelection>(createEmptySelection());
	let pillAnchor = $state<{ top: number; left: number } | null>(null);

	type Interaction =
		| {
				type: 'move';
				anchorZoneId: string;
				zoneIds: string[];
				origin: ZoneGeometry;
				grabOffset: { xCm: number; yCm: number };
				blockId: string | null;
		  }
		| {
				type: 'resize';
				zoneId: string;
				handle: ResizeHandle;
				origin: ZoneGeometry;
				startX: number;
				startY: number;
		  };

	let interaction = $state<Interaction | null>(null);

	const baseLayout = $derived(buildBristolLayout());
	const pageCount = $derived(
		continuous ? computeContinuousPageCount(sheet.zones, baseLayout) : 1
	);
	const layout = $derived(
		continuous ? buildContinuousLayout(pageCount) : baseLayout
	) as ContinuousLayout | ReturnType<typeof buildBristolLayout>;
	const area = $derived(getWritableArea(layout));
	const { specs } = $derived(layout);
	const sheetHeightCm = $derived(
		continuous && 'totalHeightCm' in layout ? layout.totalHeightCm : specs.heightCm
	);
	const pageBreaks = $derived(
		continuous ? getPageBreakPositions(pageCount, specs.heightCm) : []
	);
	const writableHeightCm = $derived(
		continuous ? sheetHeightCm - layout.headerLineCm : area.heightCm
	);
	const pillMode = $derived(getPillMode(selection));

	function updateZone(zoneId: string, patch: Partial<WriteZone>) {
		sheet = {
			...sheet,
			zones: sheet.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone))
		};
	}

	function getZoneGeometry(zone: WriteZone): ZoneGeometry {
		return {
			lineIndex: zone.lineIndex,
			leftCm: zone.leftCm,
			widthCm: zone.widthCm,
			lineCount: zone.lineCount
		};
	}

	function focusZoneEditor(zoneId: string, placeCaretAtEnd = false) {
		tick().then(() => {
			const editor = sheetEl?.querySelector<HTMLElement>(`[data-zone-id="${zoneId}"] .zone-editor`);
			if (!editor) return;

			editor.focus();

			if (!placeCaretAtEnd) return;

			const range = document.createRange();
			range.selectNodeContents(editor);
			range.collapse(false);
			const selectionApi = window.getSelection();
			selectionApi?.removeAllRanges();
			selectionApi?.addRange(range);
		});
	}

	function markSheetActive() {
		setActiveSheetKey(sheetKey);
	}

	function isEventInZoneEditor(event: KeyboardEvent): boolean {
		return !!(event.target as HTMLElement).closest('.zone-editor');
	}

	async function createZoneOnNextFreeLine() {
		purgeEmptyZone(getPrimarySelectedZoneId(sheet, selection));

		const placement = findNextZonePlacement(sheet.zones, layout);
		if (!placement) return;

		const zone = createWriteZone({
			lineIndex: placement.lineIndex,
			leftCm: placement.leftCm,
			widthCm: DEFAULT_ZONE_WIDTH_CM
		});
		sheet = { ...sheet, zones: [...sheet.zones, zone] };
		selection = selectSingleZone(zone.id);
	}

	function moveSelectionByArrow(direction: import('$lib/zone/types.js').ArrowDirection) {
		const anchorId = getPrimarySelectedZoneId(sheet, selection);
		if (!anchorId) return;

		const zone = sheet.zones.find((item) => item.id === anchorId);
		if (!zone) return;

		const next = moveZoneByArrow(getZoneGeometry(zone), direction, layout, specs.widthCm);

		if (selection.selectedBlockId) {
			sheet = moveBlockZones(sheet, selection.selectedBlockId, anchorId, next);
			return;
		}

		if (selection.selectedZoneIds.length > 1) {
			sheet = moveZonesByDelta(sheet, selection.selectedZoneIds, anchorId, next);
			return;
		}

		updateZone(anchorId, next);
	}

	function copySelectionToClipboard() {
		const zones = getSelectedZones(sheet, selection);
		if (zones.length === 0) return;
		copyZonesToClipboard(zones);
	}

	function pasteFromClipboard() {
		const zones = readZonesFromClipboard();
		if (!zones || zones.length === 0) return;

		const result = pasteZones(sheet, zones);
		sheet = result.sheet;
		selection = applyPasteSelection(result);
	}

	function handleCreateBlock() {
		if (selection.selectedZoneIds.length < 2) return;
		const result = createBlockFromZoneIds(sheet, selection.selectedZoneIds);
		sheet = result.sheet;
		selection = applyCreateBlockSelection(result.blockId);
	}

	function handleUnblock() {
		if (!selection.selectedBlockId) return;
		sheet = removeBlock(sheet, selection.selectedBlockId);
		selection = clearSelection(selection);
	}

	function handleDuplicateBlock() {
		if (!selection.selectedBlockId) return;
		const result = duplicateBlock(sheet, selection.selectedBlockId);
		sheet = result.sheet;
		selection = applyDuplicateBlockSelection(result.newBlockId);
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (!sheetEl) return;

		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, button, [role="toolbar"]')) return;

		const action = resolveSheetKeyAction(event, {
			editable,
			isActiveSheet: isActiveSheetKey(sheetKey),
			selection,
			sheet,
			isEventInZoneEditor: isEventInZoneEditor(event)
		});

		if (action.type === 'copy') {
			event.preventDefault();
			copySelectionToClipboard();
			return;
		}

		if (action.type === 'paste') {
			event.preventDefault();
			pasteFromClipboard();
			return;
		}

		if (action.type === 'delete') {
			event.preventDefault();
			selection = clearSelection({ ...selection, editingZoneId: null });
			removeZones(action.zoneIds);
			return;
		}

		if (action.type === 'focus-editor') {
			event.preventDefault();
			focusZoneEditor(action.zoneId, true);
			return;
		}

		if (action.type === 'move') {
			event.preventDefault();
			moveSelectionByArrow(action.direction);
			return;
		}

		if (action.type === 'create-zone') {
			event.preventDefault();
			void createZoneOnNextFreeLine();
		}
	}

	function handleEmptyZoneEnter(zoneId: string) {
		const zone = sheet.zones.find((item) => item.id === zoneId);
		if (!zone || !isZoneEmpty(zone.content)) return;

		selection = removeZoneFromSelection(selection, zoneId);
		selection = { ...selection, editingZoneId: null };
		removeZone(zoneId);
		void createZoneOnNextFreeLine();
	}

	function handleEditorFocus(zoneId: string, editor: HTMLElement) {
		markSheetActive();
		selection = selectSingleZone(zoneId, true);
		oneditorfocus?.(editor);
	}

	function handleEditorBlur(zoneId: string) {
		flushZoneEditor(zoneId);
		selection = blurZoneEdit(selection, zoneId);
	}

	function handleZoneSelect(zoneId: string, event: MouseEvent) {
		markSheetActive();
		selection = selectZone(sheet, selection, zoneId, event.shiftKey);
	}

	function handleZoneEditRequest(zoneId: string) {
		markSheetActive();
		selection = enterZoneEdit(zoneId);
		focusZoneEditor(zoneId, true);
	}

	function handleSheetDoubleClick(event: MouseEvent) {
		if (!editable || !sheetEl) return;
		if ((event.target as HTMLElement).closest('.write-zone')) return;

		markSheetActive();
		const rect = sheetEl.getBoundingClientRect();
		const point = clientToSheetCm(
			event.clientX,
			event.clientY,
			rect,
			specs.widthCm,
			sheetHeightCm
		);
		const zone = createZoneAtPoint(point, layout, specs.widthCm);
		sheet = { ...sheet, zones: [...sheet.zones, zone] };
		selection = selectSingleZone(zone.id);
		focusZoneEditor(zone.id);
	}

	function removeZone(zoneId: string) {
		removeZones([zoneId]);
	}

	function removeZones(zoneIds: string[]) {
		const removed = new Set(zoneIds);
		sheet = removeZonesFromBlocks(
			{
				...sheet,
				zones: sheet.zones.filter((zone) => !removed.has(zone.id))
			},
			zoneIds
		);
	}

	function purgeEmptyZone(zoneId: string | null) {
		if (!zoneId) return;
		const zone = sheet.zones.find((item) => item.id === zoneId);
		if (zone && isZoneEmpty(zone.content)) {
			removeZone(zoneId);
		}
	}

	function handleSheetPointerDown(event: PointerEvent) {
		if (!editable) return;
		if ((event.target as HTMLElement).closest('.write-zone')) return;
		if ((event.target as HTMLElement).closest('.zone-action-pill')) return;

		markSheetActive();
		purgeEmptyZone(getPrimarySelectedZoneId(sheet, selection));
		selection = clearSelection({ ...selection, editingZoneId: null });
	}

	function startMove(zoneId: string, event: PointerEvent) {
		if (!editable || !sheetEl) return;
		const zone = sheet.zones.find((item) => item.id === zoneId);
		if (!zone) return;

		flushZoneEditor(zoneId);

		const rect = sheetEl.getBoundingClientRect();
		const pointer = clientToSheetCm(
			event.clientX,
			event.clientY,
			rect,
			specs.widthCm,
			sheetHeightCm
		);
		const grabOffset = {
			xCm: pointer.xCm - zone.leftCm,
			yCm: pointer.yCm - getZoneTopCm(zone.lineIndex, layout)
		};

		const groupZoneIds = getMoveGroupZoneIds(sheet, selection, zoneId);
		const blockId =
			selection.selectedBlockId && groupZoneIds.length > 1 && groupZoneIds.includes(zoneId)
				? selection.selectedBlockId
				: null;

		if (!selection.selectedBlockId && groupZoneIds.length === 1) {
			selection = selectSingleZone(zoneId);
		} else {
			selection = { ...selection, editingZoneId: null };
		}

		interaction = {
			type: 'move',
			anchorZoneId: zoneId,
			zoneIds: groupZoneIds,
			origin: getZoneGeometry(zone),
			grabOffset,
			blockId
		};
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
		(event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId);
		event.preventDefault();
	}

	function startResize(zoneId: string, event: PointerEvent, handle: ResizeHandle) {
		if (!editable) return;
		const zone = sheet.zones.find((item) => item.id === zoneId);
		if (!zone) return;

		flushZoneEditor(zoneId);

		selection = selectSingleZone(zoneId);
		interaction = {
			type: 'resize',
			zoneId,
			handle,
			origin: getZoneGeometry(zone),
			startX: event.clientX,
			startY: event.clientY
		};
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
		event.preventDefault();
	}

	function handlePointerMove(event: PointerEvent) {
		const current = interaction;
		if (!current || !sheetEl) return;

		const rect = sheetEl.getBoundingClientRect();

		if (current.type === 'move') {
			const pointer = clientToSheetCm(
				event.clientX,
				event.clientY,
				rect,
				specs.widthCm,
				sheetHeightCm
			);
			const next = moveZoneWithGrab(
				current.origin,
				pointer,
				current.grabOffset,
				layout,
				specs.widthCm
			);

			if (current.zoneIds.length === 1) {
				updateZone(current.anchorZoneId, next);
				return;
			}

			if (current.blockId) {
				sheet = moveBlockZones(sheet, current.blockId, current.anchorZoneId, next);
				return;
			}

			sheet = moveZonesByDelta(sheet, current.zoneIds, current.anchorZoneId, next);
			return;
		}

		const delta = {
			xCm: ((event.clientX - current.startX) / rect.width) * specs.widthCm,
			yCm: ((event.clientY - current.startY) / rect.height) * sheetHeightCm
		};
		const next = resizeZone(current.origin, current.handle, delta, layout, specs.widthCm);
		updateZone(current.zoneId, next);
	}

	function handlePointerUp() {
		interaction = null;
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
	}

	async function handleZoneInput(zoneId: string, editor: HTMLElement) {
		const zone = sheet.zones.find((item) => item.id === zoneId);
		if (!zone) return;

		persistZoneContent(zoneId, editor);

		const maxLines = getZoneMaxLines(zone, layout);
		const measuredLines = measureEditorLineCount(editor, zone.lineCount);

		await tick();

		if (editor.scrollHeight <= editor.clientHeight + 1 && measuredLines <= maxLines) {
			return;
		}

		const split = splitZoneEditorOverflow(editor, maxLines);
		updateZone(zoneId, {
			content: sanitizeEditorHtml(split.current),
			lineCount: split.lineCount
		});

		if (!split.overflow) return;

		const overflowLineCount = Math.max(1, split.overflow.split('\n').length);

		if (continuous) {
			const continuationLineIndex = zone.lineIndex + split.lineCount;
			const continuation = createContinuationZone(
				zone,
				split.overflow,
				overflowLineCount,
				continuationLineIndex
			);
			sheet = { ...sheet, zones: [...sheet.zones, continuation] };
			await tick();
			focusZoneEditor(continuation.id);
			return;
		}

		onzoneoverflow?.({
			zoneId,
			continuation: createContinuationZone(zone, split.overflow, overflowLineCount)
		});
	}

	function persistZoneContent(zoneId: string, editor: HTMLElement) {
		const zone = sheet.zones.find((item) => item.id === zoneId);
		if (!zone) return;

		const maxLines = getZoneMaxLines(zone, layout);
		const measuredLines = measureEditorLineCount(editor, zone.lineCount);
		const lineCount = Math.min(Math.max(measuredLines, MIN_ZONE_LINES), maxLines);

		updateZone(zoneId, {
			content: sanitizeEditorHtml(editor.innerHTML),
			lineCount
		});
	}

	function flushZoneEditor(zoneId: string) {
		const editor = sheetEl?.querySelector<HTMLElement>(
			`[data-zone-id="${zoneId}"] .zone-editor`
		);
		if (!editor) return;
		persistZoneContent(zoneId, editor);
	}

	$effect(() => {
		if (!editable) {
			pillAnchor = null;
			return;
		}

		selection;
		sheet.zones;
		viewportScale;

		return trackSelectionAnchor({
			getRoot: () => sheetEl,
			getZoneIds: () => getHighlightedZoneIds(sheet, selection),
			onAnchorChange: (anchor) => {
				pillAnchor = anchor;
			}
		});
	});

	$effect(() => {
		if (!editable) return;
		return registerSheetKeydown(sheetKey, handleDocumentKeydown);
	});
</script>

<div class="sheet-outer" class:continuous>
	{#if continuous && editable}
		<div class="page-labels no-print" aria-hidden="true">
			{#each Array(pageCount) as _, pageIndex (pageIndex)}
				<span class="page-label" style:top="{pageIndex * specs.heightCm}cm">
					Page {pageIndex + 1}
				</span>
			{/each}
		</div>
	{/if}

	<div
		bind:this={sheetEl}
		class="bristol-sheet group/sheet relative bg-white text-black shadow-md {className}"
		role="application"
		aria-label="Feuille Bristol"
		style:width="{specs.widthCm}cm"
		style:height="{sheetHeightCm}cm"
		style:--text-offset={TEXT_OFFSET}
		ondblclick={handleSheetDoubleClick}
		onpointerdown={handleSheetPointerDown}
	>
	{#if deletable && ondelete}
		<div class="delete-corner no-print">
			<button
				type="button"
				class="delete-sheet"
				aria-label="Supprimer cette feuille"
				onclick={ondelete}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>
		</div>
	{/if}

	<div class="sheet-preview-layer" aria-hidden="true">
		{#if !continuous}
			<div
				class="header-shield pointer-events-none absolute right-0 left-0 z-0"
				style:top="0"
				style:height="calc({layout.headerLineCm}cm - 1px)"
			></div>

			<div
				class="absolute right-0 left-0 border-t border-neutral-400"
				style:top="{layout.headerLineCm}cm"
			></div>
		{/if}

		{#each layout.lines as line (line.index)}
			<div
				class="absolute right-0 left-0 border-t border-neutral-300"
				style:top="{line.positionCm}cm"
			></div>
		{/each}

		{#if !continuous}
			<div
				class="absolute border border-neutral-500"
				style:left="{layout.cornerMarks.bottomLeft.x}cm"
				style:top="{layout.cornerMarks.bottomLeft.y}cm"
				style:width="{layout.cornerMarks.bottomLeft.size}cm"
				style:height="{layout.cornerMarks.bottomLeft.size}cm"
			></div>

			<div
				class="absolute border border-neutral-500"
				style:left="{layout.cornerMarks.bottomRight.x}cm"
				style:top="{layout.cornerMarks.bottomRight.y}cm"
				style:width="{layout.cornerMarks.bottomRight.size}cm"
				style:height="{layout.cornerMarks.bottomRight.size}cm"
			></div>
		{/if}

		{#each pageBreaks as breakCm (breakCm)}
			<div class="page-break-line absolute right-0 left-0" style:top="{breakCm}cm"></div>
		{/each}
	</div>

	{#if editable}
		<div
			class="writable-surface no-print"
			style:top="{area.topCm}cm"
			style:height="{writableHeightCm}cm"
			aria-hidden="true"
		></div>
	{/if}

	{#each sheet.zones as zone (zone.id)}
		<WriteZoneBlock
			{zone}
			{layout}
			{editable}
			selected={editable && isZoneSelected(sheet, selection, zone.id)}
			blockSelected={editable &&
				isZoneBlockSelected(sheet, selection, zone.id) &&
				!isEditingZone(selection, zone.id)}
			editing={editable && isEditingZone(selection, zone.id)}
			onselect={(event) => handleZoneSelect(zone.id, event)}
			oneditrequest={() => handleZoneEditRequest(zone.id)}
			oninput={(editor) => handleZoneInput(zone.id, editor)}
			onfocus={(editor) => handleEditorFocus(zone.id, editor)}
			onblur={() => handleEditorBlur(zone.id)}
			onmovestart={(event) => startMove(zone.id, event)}
			onresizestart={(event, handle) => startResize(zone.id, event, handle)}
			onemptyenter={() => handleEmptyZoneEnter(zone.id)}
		/>
	{/each}
	</div>
</div>

{#if editable}
	<ZoneActionPill
		anchor={pillAnchor}
		mode={pillMode}
		oncreateblock={handleCreateBlock}
		onunblock={handleUnblock}
		onduplicate={handleDuplicateBlock}
	/>
{/if}

<style>
	.sheet-outer {
		position: relative;
	}

	.sheet-outer.continuous {
		display: flex;
		align-items: flex-start;
	}

	.page-labels {
		position: relative;
		flex-shrink: 0;
		width: 3.25rem;
		margin-right: 0.625rem;
	}

	.page-label {
		position: absolute;
		left: 0;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.6875rem;
		font-weight: 500;
		line-height: 1;
		color: oklch(0.58 0 0);
		white-space: nowrap;
		transform: translateY(0.35rem);
	}

	.page-break-line {
		border-top: 2px solid oklch(0.72 0 0);
		pointer-events: none;
		z-index: 1;
	}

	.writable-surface {
		position: absolute;
		right: 0;
		left: 0;
		z-index: 10;
	}

	.delete-corner {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 40;
		width: 2.25rem;
		height: 2.25rem;
	}

	.delete-sheet {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: 1px solid oklch(0.88 0 0);
		border-radius: 9999px;
		background: white;
		color: oklch(0.55 0 0);
		opacity: 0;
		transform: translate(50%, -50%) scale(0.9);
		transition:
			opacity 150ms ease,
			transform 150ms ease,
			color 150ms ease;
		cursor: pointer;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
		pointer-events: none;
	}

	.delete-corner:hover .delete-sheet,
	.delete-sheet:focus-visible {
		opacity: 1;
		transform: translate(50%, -50%) scale(1);
		pointer-events: auto;
	}

	.delete-corner:hover .delete-sheet {
		pointer-events: auto;
	}

	.delete-sheet:hover {
		color: var(--destructive);
	}

	@media print {
		.sheet-outer.continuous {
			display: block;
		}

		.page-labels {
			display: none !important;
		}

		.page-break-line {
			display: none !important;
		}

		.bristol-sheet {
			box-shadow: none !important;
			background: transparent !important;
		}

		.bristol-sheet:not(.print-clip-child) {
			page-break-after: always;
			break-after: page;
		}

		.bristol-sheet:not(.print-clip-child):last-child {
			page-break-after: auto;
			break-after: auto;
		}

		.sheet-preview-layer {
			display: none !important;
		}
	}
</style>
