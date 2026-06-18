<script lang="ts">
	import { TEXT_OFFSET } from '$lib/bristol/layout.js';
	import { getShortcutCommand } from '$lib/editor/shortcuts.js';
	import { sanitizeEditorHtml } from '$lib/editor/sanitize.js';
	import {
		applyBold,
		applyCode,
		applyItalic,
		applyUnderline,
		insertLineBreak,
		isInList,
		tryAutoList
	} from '$lib/editor/format/index.js';
	import {
		getZoneHeightCm,
		getZoneTopCm,
		type ResizeHandle,
		type WriteZone
	} from '$lib/zone/index.js';
	import type { BristolLayout } from '$lib/bristol/layout.js';

	type Props = {
		zone: WriteZone;
		layout: BristolLayout;
		selected?: boolean;
		editing?: boolean;
		editable?: boolean;
		oninput?: (editor: HTMLElement) => void;
		onfocus?: (editor: HTMLElement) => void;
		onblur?: () => void;
		onselect?: () => void;
		onmovestart?: (event: PointerEvent) => void;
		onresizestart?: (event: PointerEvent, handle: ResizeHandle) => void;
		onemptyenter?: () => void;
	};

	let {
		zone,
		layout,
		selected = false,
		editing = false,
		editable = true,
		oninput,
		onfocus,
		onblur,
		onselect,
		onmovestart,
		onresizestart,
		onemptyenter
	}: Props = $props();

	const CORNER_HANDLES: ResizeHandle[] = ['nw', 'ne', 'sw', 'se'];
	const EDGE_HANDLES: ResizeHandle[] = ['n', 'e', 's', 'w'];

	const EDGE_SIZE = '0.22rem';

	let editorEl = $state<HTMLElement | null>(null);
	let syncingFromContent = false;

	const topCm = $derived(getZoneTopCm(zone.lineIndex, layout));
	const heightCm = $derived(getZoneHeightCm(zone.lineCount, layout));
	const lineHeightCm = $derived(layout.specs.lineSpacingCm);
	const safeContent = $derived(sanitizeEditorHtml(zone.content));

	$effect(() => {
		if (!editorEl || !editable) return;
		const stored = zone.content || '';
		const current = editorEl.innerHTML;
		if (!stored && !current) return;
		if (sanitizeEditorHtml(current) === sanitizeEditorHtml(stored)) return;
		if (document.activeElement === editorEl) return;

		syncingFromContent = true;
		// eslint-disable-next-line svelte/no-dom-manipulating -- sync external zone content into contenteditable
		editorEl.innerHTML = stored;
		syncingFromContent = false;
	});

	function handleInput() {
		if (!editorEl || syncingFromContent) return;
		if (tryAutoList(editorEl)) {
			oninput?.(editorEl);
			return;
		}
		oninput?.(editorEl);
	}

	function handleFocus() {
		if (!editorEl) return;
		onfocus?.(editorEl);
	}

	function handleBlur() {
		onblur?.();
	}

	function handleEditorPointerDown(event: PointerEvent) {
		event.stopPropagation();
		if (!selected) {
			onselect?.();
			event.preventDefault();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!editorEl) return;

		const shortcut = getShortcutCommand(event);
		if (shortcut) {
			event.preventDefault();
			if (shortcut === 'bold') applyBold(editorEl);
			if (shortcut === 'italic') applyItalic(editorEl);
			if (shortcut === 'underline') applyUnderline(editorEl);
			handleInput();
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			editorEl.blur();
			return;
		}

		if (event.key === 'Enter' && !event.shiftKey) {
			if (isInList(editorEl)) return;

			const text = editorEl.innerText.replace(/\u200b/g, '').trim();
			if (!text) {
				onemptyenter?.();
				event.preventDefault();
				return;
			}

			event.preventDefault();
			insertLineBreak(editorEl);
			handleInput();
			return;
		}

		if ((event.ctrlKey || event.metaKey) && event.key === '`') {
			event.preventDefault();
			applyCode(editorEl);
			handleInput();
		}
	}

	function startDrag(event: PointerEvent) {
		event.stopPropagation();
		event.preventDefault();
		onselect?.();
		onmovestart?.(event);
	}

	function startResize(event: PointerEvent, handle: ResizeHandle) {
		event.stopPropagation();
		event.preventDefault();
		onresizestart?.(event, handle);
	}
</script>

<div
	class="write-zone"
	class:selected
	class:editing
	class:editable
	data-zone-id={zone.id}
	role="group"
	aria-label="Zone d'écriture"
	style:top="{topCm}cm"
	style:left="{zone.leftCm}cm"
	style:width="{zone.widthCm}cm"
	style:height="{heightCm}cm"
	style:--line-height-cm="{lineHeightCm}cm"
	style:--text-offset={TEXT_OFFSET}
	style:--edge-size={EDGE_SIZE}
>
	{#if editable}
		<div class="zone-chrome no-print" class:selected aria-hidden="true"></div>

		<div class="zone-drag-frame no-print" aria-hidden="true">
			<button
				type="button"
				class="zone-edge zone-edge-top"
				aria-label="Déplacer la zone"
				onpointerdown={startDrag}
			></button>
			<button
				type="button"
				class="zone-edge zone-edge-right"
				aria-label="Déplacer la zone"
				onpointerdown={startDrag}
			></button>
			<button
				type="button"
				class="zone-edge zone-edge-bottom"
				aria-label="Déplacer la zone"
				onpointerdown={startDrag}
			></button>
			<button
				type="button"
				class="zone-edge zone-edge-left"
				aria-label="Déplacer la zone"
				onpointerdown={startDrag}
			></button>
		</div>

		{#if selected}
			{#each CORNER_HANDLES as handle (handle)}
				<button
					type="button"
					class="resize-handle corner handle-{handle} no-print"
					aria-label="Redimensionner {handle}"
					onpointerdown={(event) => startResize(event, handle)}
				></button>
			{/each}

			{#each EDGE_HANDLES as handle (handle)}
				<button
					type="button"
					class="resize-handle edge handle-{handle} no-print"
					aria-label="Redimensionner {handle}"
					onpointerdown={(event) => startResize(event, handle)}
				></button>
			{/each}
		{/if}
	{/if}

	{#if editable}
		<div
			bind:this={editorEl}
			class="zone-editor sheet-editor caveat-sheet"
			contenteditable="true"
			tabindex="0"
			role="textbox"
			aria-multiline="true"
			aria-label="Zone d'écriture"
			spellcheck="false"
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			ondragend={handleInput}
			ondrop={handleInput}
			onkeydown={handleKeydown}
			onpointerdown={handleEditorPointerDown}
		></div>
	{:else if safeContent}
		<div class="zone-editor sheet-editor caveat-sheet pointer-events-none">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html safeContent}
		</div>
	{/if}
</div>

<style>
	.write-zone {
		position: absolute;
		z-index: 20;
		box-sizing: border-box;
	}

	.zone-chrome {
		position: absolute;
		inset: 0;
		pointer-events: none;
		border: 1px solid transparent;
		transition:
			border-color var(--ui-state-dur) var(--ui-state-ease),
			border-width var(--ui-state-dur) var(--ui-state-ease);
	}

	.zone-chrome.selected {
		border-color: oklch(0.86 0 0 / 0.95);
	}

	.write-zone.editable.selected .zone-chrome {
		border-color: oklch(0.78 0 0 / 0.72);
	}

	.write-zone.editable.selected:not(.editing) .zone-editor {
		cursor: default;
		caret-color: transparent;
	}

	.zone-drag-frame {
		position: absolute;
		inset: 0;
		z-index: 4;
		pointer-events: none;
	}

	.zone-edge {
		position: absolute;
		pointer-events: auto;
		cursor: grab;
		touch-action: none;
		border: none;
		padding: 0;
		background: transparent;
		transition: background var(--ui-press-dur) var(--ui-press-ease);
	}

	.zone-edge::before {
		content: '';
		position: absolute;
		inset: -0.1875rem;
	}

	.zone-edge:hover {
		background: oklch(0.82 0 0 / 0.12);
	}

	.zone-edge:active {
		cursor: grabbing;
		background: oklch(0.78 0 0 / 0.16);
	}

	.zone-edge-top {
		top: 0;
		right: 0;
		left: 0;
		height: var(--edge-size);
	}

	.zone-edge-bottom {
		right: 0;
		bottom: 0;
		left: 0;
		height: var(--edge-size);
	}

	.zone-edge-left {
		top: 0;
		bottom: 0;
		left: 0;
		width: var(--edge-size);
	}

	.zone-edge-right {
		top: 0;
		right: 0;
		bottom: 0;
		width: var(--edge-size);
	}

	.resize-handle {
		position: absolute;
		z-index: 5;
		border: none;
		padding: 0;
	}

	.resize-handle::before {
		content: '';
		position: absolute;
		inset: -0.25rem;
	}

	.resize-handle.corner {
		width: 0.32rem;
		height: 0.32rem;
		background: oklch(0.8 0 0);
		transition: background var(--ui-press-dur) var(--ui-press-ease);
	}

	.resize-handle.corner:hover {
		background: oklch(0.72 0 0);
	}

	.handle-nw {
		top: -1px;
		left: -1px;
		clip-path: polygon(0 0, 100% 0, 0 100%);
		cursor: nw-resize;
	}

	.handle-ne {
		top: -1px;
		right: -1px;
		clip-path: polygon(0 0, 100% 0, 100% 100%);
		cursor: ne-resize;
	}

	.handle-sw {
		bottom: -1px;
		left: -1px;
		clip-path: polygon(0 0, 0 100%, 100% 100%);
		cursor: sw-resize;
	}

	.handle-se {
		right: -1px;
		bottom: -1px;
		clip-path: polygon(100% 0, 0 100%, 100% 100%);
		cursor: se-resize;
	}

	.resize-handle.edge {
		background: oklch(0.8 0 0);
		transition: background var(--ui-press-dur) var(--ui-press-ease);
	}

	.resize-handle.edge:hover {
		background: oklch(0.72 0 0);
	}

	.handle-n {
		top: -1px;
		left: 50%;
		width: 0.45rem;
		height: 1px;
		transform: translateX(-50%);
		cursor: n-resize;
	}

	.handle-s {
		bottom: -1px;
		left: 50%;
		width: 0.45rem;
		height: 1px;
		transform: translateX(-50%);
		cursor: s-resize;
	}

	.handle-w {
		top: 50%;
		left: -1px;
		width: 1px;
		height: 0.45rem;
		transform: translateY(-50%);
		cursor: w-resize;
	}

	.handle-e {
		top: 50%;
		right: -1px;
		width: 1px;
		height: 0.45rem;
		transform: translateY(-50%);
		cursor: e-resize;
	}

	.caveat-sheet {
		font-family: 'Caveat', cursive;
		font-optical-sizing: auto;
		font-weight: 500;
		font-style: normal;
	}

	.zone-editor {
		position: absolute;
		z-index: 2;
		inset: 0;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		margin: 0;
		border: 0;
		background: transparent;
		outline: none;
		overflow: hidden;
		font-size: 11pt;
		line-height: var(--line-height-cm);
		padding: 0 0.12cm;
		transform: translateY(var(--text-offset, 0.08cm));
		color: var(--text-default);
		white-space: pre-wrap;
		word-break: break-word;
	}

	:global(.zone-editor code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.92em;
		background: oklch(0.95 0 0);
		padding: 0 0.12em;
		border-radius: 2px;
	}

	:global(.zone-editor mark) {
		border-radius: 2px;
		padding: 0 0.08em;
	}

	:global(.zone-editor ul),
	:global(.zone-editor ol) {
		margin: 0;
		padding-left: 1.1em;
	}

	:global(.zone-editor ul.list-dash) {
		list-style: none;
		padding-left: 0.4em;
	}

	:global(.zone-editor ul.list-dash li::marker) {
		content: '';
	}

	:global(.zone-editor ul.list-dash > li::before) {
		content: '- ';
	}

	:global(.zone-editor ol.list-roman) {
		list-style-type: upper-roman;
	}

	@media print {
		.zone-chrome,
		.zone-drag-frame {
			display: none;
		}

		.zone-editor {
			inset: 0;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.zone-chrome,
		.zone-edge,
		.resize-handle {
			transition: none;
		}
	}
</style>
