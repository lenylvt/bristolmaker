<script lang="ts">
	import WriteZoneBlock from '$lib/components/bristol/WriteZone.svelte';
	import { buildBristolLayout, getWritableArea, TEXT_OFFSET } from '$lib/bristol/layout.js';
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
		type ArrowDirection,
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
	import { registerSheetKeydown } from '$lib/state/sheet-keyboard.js';
	import { tick } from 'svelte';

	type OverflowPayload = {
		zoneId: string;
		continuation: WriteZone;
	};

	type Props = {
		sheet?: SheetData;
		sheetKey?: string;
		editable?: boolean;
		deletable?: boolean;
		class?: string;
		onzoneoverflow?: (payload: OverflowPayload) => void;
		oneditorfocus?: (editor: HTMLElement) => void;
		ondelete?: () => void;
	};

	let {
		sheet = $bindable({ id: 'sheet-0', zones: [] }),
		sheetKey = 'sheet-0',
		editable = true,
		deletable = false,
		class: className = '',
		onzoneoverflow,
		oneditorfocus,
		ondelete
	}: Props = $props();

	let sheetEl = $state<HTMLElement | null>(null);
	let selectedZoneId = $state<string | null>(null);

	type Interaction =
		| {
				type: 'move';
				zoneId: string;
				origin: ZoneGeometry;
				grabOffset: { xCm: number; yCm: number };
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
	let editingZoneId = $state<string | null>(null);

	const layout = $derived(buildBristolLayout());
	const area = $derived(getWritableArea(layout));
	const { specs } = $derived(layout);

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
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		});
	}

	function markSheetActive() {
		setActiveSheetKey(sheetKey);
	}

	function isZoneEditing(zoneId: string): boolean {
		return editingZoneId === zoneId;
	}

	function isEventInZoneEditor(event: KeyboardEvent): boolean {
		return !!(event.target as HTMLElement).closest('.zone-editor');
	}

	async function createZoneOnNextFreeLine() {
		purgeEmptyZone(selectedZoneId);

		const placement = findNextZonePlacement(sheet.zones, layout);
		if (!placement) return;

		const zone = createWriteZone({
			lineIndex: placement.lineIndex,
			leftCm: placement.leftCm,
			widthCm: DEFAULT_ZONE_WIDTH_CM
		});
		sheet = { ...sheet, zones: [...sheet.zones, zone] };
		selectedZoneId = zone.id;
		editingZoneId = null;
	}

	function moveSelectedZone(direction: ArrowDirection) {
		if (!selectedZoneId) return;

		const zone = sheet.zones.find((item) => item.id === selectedZoneId);
		if (!zone) return;

		const next = moveZoneByArrow(getZoneGeometry(zone), direction, layout, specs.widthCm);
		updateZone(selectedZoneId, next);
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (!editable || !sheetEl) return;

		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, button, [role="toolbar"]')) return;

		if (selectedZoneId && !isZoneEditing(selectedZoneId) && !isEventInZoneEditor(event)) {
			if (event.key === 'Delete' || event.key === 'Backspace') {
				event.preventDefault();
				const zoneId = selectedZoneId;
				selectedZoneId = null;
				editingZoneId = null;
				removeZone(zoneId);
				return;
			}

			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				focusZoneEditor(selectedZoneId, true);
				return;
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault();
				moveSelectedZone('up');
				return;
			}

			if (event.key === 'ArrowDown') {
				event.preventDefault();
				moveSelectedZone('down');
				return;
			}

			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				moveSelectedZone('left');
				return;
			}

			if (event.key === 'ArrowRight') {
				event.preventDefault();
				moveSelectedZone('right');
				return;
			}
		}

		if (event.key === 'Enter' && !event.shiftKey && !isEventInZoneEditor(event) && !editingZoneId) {
			if (!isActiveSheetKey(sheetKey)) return;
			if (selectedZoneId && !isZoneEditing(selectedZoneId)) return;

			event.preventDefault();
			void createZoneOnNextFreeLine();
		}
	}

	function handleEmptyZoneEnter(zoneId: string) {
		const zone = sheet.zones.find((item) => item.id === zoneId);
		if (!zone || !isZoneEmpty(zone.content)) return;

		if (selectedZoneId === zoneId) selectedZoneId = null;
		editingZoneId = null;
		removeZone(zoneId);
		void createZoneOnNextFreeLine();
	}

	function handleEditorFocus(zoneId: string, editor: HTMLElement) {
		markSheetActive();
		selectedZoneId = zoneId;
		editingZoneId = zoneId;
		oneditorfocus?.(editor);
	}

	function handleEditorBlur(zoneId: string) {
		flushZoneEditor(zoneId);
		if (editingZoneId === zoneId) editingZoneId = null;
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
			specs.heightCm
		);
		const zone = createZoneAtPoint(point, layout, specs.widthCm);
		sheet = { ...sheet, zones: [...sheet.zones, zone] };
		selectedZoneId = zone.id;
		focusZoneEditor(zone.id);
	}

	function removeZone(zoneId: string) {
		sheet = { ...sheet, zones: sheet.zones.filter((zone) => zone.id !== zoneId) };
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

		markSheetActive();
		purgeEmptyZone(selectedZoneId);
		selectedZoneId = null;
		editingZoneId = null;
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
			specs.heightCm
		);
		const grabOffset = {
			xCm: pointer.xCm - zone.leftCm,
			yCm: pointer.yCm - getZoneTopCm(zone.lineIndex, layout)
		};

		selectedZoneId = zoneId;
		editingZoneId = null;
		interaction = { type: 'move', zoneId, origin: getZoneGeometry(zone), grabOffset };
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

		selectedZoneId = zoneId;
		editingZoneId = null;
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
				specs.heightCm
			);
			const next = moveZoneWithGrab(
				current.origin,
				pointer,
				current.grabOffset,
				layout,
				specs.widthCm
			);
			updateZone(current.zoneId, next);
			return;
		}

		const delta = {
			xCm: ((event.clientX - current.startX) / rect.width) * specs.widthCm,
			yCm: ((event.clientY - current.startY) / rect.height) * specs.heightCm
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
		if (!editable) return;
		return registerSheetKeydown(sheetKey, handleDocumentKeydown);
	});
</script>

<div
	bind:this={sheetEl}
	class="bristol-sheet group/sheet relative bg-white text-black shadow-md {className}"
	role="application"
	aria-label="Feuille Bristol"
	style:width="{specs.widthCm}cm"
	style:height="{specs.heightCm}cm"
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
		<div
			class="header-shield pointer-events-none absolute right-0 left-0 z-0"
			style:top="0"
			style:height="calc({layout.headerLineCm}cm - 1px)"
		></div>

		<div
			class="absolute right-0 left-0 border-t border-neutral-400"
			style:top="{layout.headerLineCm}cm"
		></div>

		{#each layout.lines as line (line.index)}
			<div
				class="absolute right-0 left-0 border-t border-neutral-300"
				style:top="{line.positionCm}cm"
			></div>
		{/each}

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
	</div>

	{#if editable}
		<div
			class="writable-surface no-print"
			style:top="{area.topCm}cm"
			style:height="{area.heightCm}cm"
			aria-hidden="true"
		></div>
	{/if}

	{#each sheet.zones as zone (zone.id)}
		<WriteZoneBlock
			{zone}
			{layout}
			{editable}
			selected={editable && selectedZoneId === zone.id}
			editing={editable && editingZoneId === zone.id}
			onselect={() => {
				markSheetActive();
				selectedZoneId = zone.id;
				editingZoneId = null;
			}}
			oninput={(editor) => handleZoneInput(zone.id, editor)}
			onfocus={(editor) => handleEditorFocus(zone.id, editor)}
			onblur={() => handleEditorBlur(zone.id)}
			onmovestart={(event) => startMove(zone.id, event)}
			onresizestart={(event, handle) => startResize(zone.id, event, handle)}
			onemptyenter={() => handleEmptyZoneEnter(zone.id)}
		/>
	{/each}
</div>

<style>
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
		.bristol-sheet {
			box-shadow: none !important;
			background: transparent !important;
			page-break-after: always;
			break-after: page;
		}

		.bristol-sheet:last-child {
			page-break-after: auto;
			break-after: auto;
		}

		.sheet-preview-layer {
			display: none !important;
		}
	}
</style>
