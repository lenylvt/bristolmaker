<script lang="ts">
	import IconStack from '$lib/components/format/IconStack.svelte';
	import { HIGHLIGHT_COLOR_VARS, TEXT_COLOR_VARS, type TextColorVar } from '$lib/editor/colors.js';
	import { animateCardResize } from '$lib/editor/pill-resize.js';
	import {
		cycleListStyle,
		cycleTextAlign,
		getActiveHighlight,
		getActiveListStyle,
		getActiveTextAlign,
		getActiveTextColor,
		getSelectionRect,
		hasEditorSelection,
		queryCodeState,
		queryFormatState,
		restoreEditorSelection,
		saveEditorSelection,
		toggleCode,
		toggleFormat,
		toggleHighlight,
		toggleTextColor,
		withPreservedEditorSelection,
		type TextAlign
	} from '$lib/editor/format/index.js';
	import {
		AlignCenter,
		AlignJustify,
		AlignLeft,
		AlignRight,
		ArrowLeft,
		Bold,
		Braces,
		Code,
		Highlighter,
		Italic,
		List,
		ListOrdered,
		Minus,
		Palette,
		Underline
	} from '@lucide/svelte';
	import { tick } from 'svelte';

	type PanelMode = 'tools' | 'text-color' | 'highlight';

	type Props = {
		editor?: HTMLElement | null;
	};

	let { editor = null }: Props = $props();

	let visible = $state(false);
	let pillTop = $state(0);
	let pillLeft = $state(0);
	let panelMode = $state<PanelMode>('tools');

	let pillCardEl = $state<HTMLElement | null>(null);
	let contentEl = $state<HTMLElement | null>(null);
	let hasMeasured = $state(false);

	let boldActive = $state(false);
	let italicActive = $state(false);
	let underlineActive = $state(false);
	let codeActive = $state(false);
	let listStyle = $state<ReturnType<typeof getActiveListStyle>>(null);
	let textColor = $state<TextColorVar | null>(null);
	let highlightColor = $state<TextColorVar | null>(null);
	const alignIcons = [
		{ id: 'left', icon: AlignLeft },
		{ id: 'center', icon: AlignCenter },
		{ id: 'right', icon: AlignRight },
		{ id: 'justify', icon: AlignJustify }
	] as const;

	const listIcons = [
		{ id: 'off', icon: List },
		{ id: 'dash', icon: Minus },
		{ id: 'decimal', icon: ListOrdered },
		{ id: 'roman', icon: List }
	] as const;

	const codeIcons = [
		{ id: 'off', icon: Code },
		{ id: 'on', icon: Braces }
	] as const;

	const listIconState = $derived(listStyle ?? 'off');
	const codeIconState = $derived(codeActive ? 'on' : 'off');
	let textAlign = $state<TextAlign>('left');
	let suppressSelectionRefresh = false;
	let pillSessionActive = false;
	let anchorTop = 0;
	let anchorLeft = 0;
	let pillRootEl = $state<HTMLElement | null>(null);
	let refreshFrame = 0;
	let sessionRange: Range | null = null;

	function rememberSelection() {
		if (!editor) return;
		const saved = saveEditorSelection(editor);
		if (saved) sessionRange = saved;
	}

	function ensurePillSelection() {
		if (!editor) return;
		if (hasEditorSelection(editor)) {
			rememberSelection();
			return;
		}
		if (!sessionRange) return;
		editor.focus();
		restoreEditorSelection(editor, sessionRange.cloneRange());
	}

	function syncFormatStates() {
		if (!editor) return;

		boldActive = queryFormatState('bold');
		italicActive = queryFormatState('italic');
		underlineActive = queryFormatState('underline');
		codeActive = queryCodeState(editor);
		listStyle = getActiveListStyle(editor);
		textColor = getActiveTextColor(editor);
		highlightColor = getActiveHighlight(editor);
		textAlign = getActiveTextAlign(editor);
	}

	function scheduleRefreshState() {
		if (refreshFrame) cancelAnimationFrame(refreshFrame);
		suppressSelectionRefresh = true;
		refreshFrame = requestAnimationFrame(() => {
			refreshFrame = requestAnimationFrame(() => {
				refreshFrame = 0;
				suppressSelectionRefresh = false;
				refreshState();
			});
		});
	}

	function closePill() {
		visible = false;
		pillSessionActive = false;
		panelMode = 'tools';
		hasMeasured = false;
		sessionRange = null;
	}

	async function resizePill(instant = false) {
		await tick();
		if (!pillCardEl || !contentEl) return;
		await animateCardResize(pillCardEl, contentEl, instant);
		hasMeasured = true;
	}

	function refreshState() {
		if (suppressSelectionRefresh) return;

		if (!editor) {
			closePill();
			return;
		}

		const hasSelection = hasEditorSelection(editor);
		const rect = hasSelection ? getSelectionRect(editor) : null;

		if (hasSelection && rect) {
			visible = true;
			pillSessionActive = true;
			pillLeft = rect.left + rect.width / 2;
			pillTop = rect.top;
			anchorLeft = pillLeft;
			anchorTop = pillTop;
			rememberSelection();
			syncFormatStates();
			return;
		}

		if (pillSessionActive) {
			visible = true;
			pillLeft = anchorLeft;
			pillTop = anchorTop;
			syncFormatStates();
			return;
		}

		closePill();
	}

	function notifyEditorInput() {
		if (!editor) return;
		editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
	}

	function run(action: () => void) {
		if (!editor) return;

		pillSessionActive = true;
		suppressSelectionRefresh = true;
		ensurePillSelection();

		try {
			withPreservedEditorSelection(editor, action);
		} finally {
			rememberSelection();
			notifyEditorInput();
			scheduleRefreshState();
		}
	}

	function handleBold() {
		run(() => toggleFormat('bold'));
	}

	function handleItalic() {
		run(() => toggleFormat('italic'));
	}

	function handleUnderline() {
		run(() => toggleFormat('underline'));
	}

	function handleCode() {
		run(() => toggleCode(editor!));
	}

	function handleList() {
		run(() => cycleListStyle(editor!));
	}

	function handleAlign() {
		run(() => cycleTextAlign(editor!));
	}

	function handleTextColor(colorVar: TextColorVar) {
		run(() => toggleTextColor(editor!, colorVar));
	}

	function handleHighlight(colorVar: TextColorVar) {
		run(() => toggleHighlight(editor!, colorVar));
	}

	async function openPanel(mode: 'text-color' | 'highlight') {
		if (!editor) return;
		pillSessionActive = true;
		ensurePillSelection();
		withPreservedEditorSelection(editor, () => {
			if (panelMode === mode) {
				panelMode = 'tools';
			} else {
				panelMode = mode;
			}
		});
		rememberSelection();
		await resizePill();
		scheduleRefreshState();
	}

	async function backToTools() {
		if (!editor) return;
		pillSessionActive = true;
		ensurePillSelection();
		withPreservedEditorSelection(editor, () => {
			panelMode = 'tools';
		});
		rememberSelection();
		await resizePill();
		scheduleRefreshState();
	}

	function handlePillPointerDown(event: PointerEvent) {
		event.preventDefault();
		pillSessionActive = true;
	}

	function handleDocumentPointerDown(event: PointerEvent) {
		if (!visible) return;

		const target = event.target as Node;
		if (pillRootEl?.contains(target)) return;

		if (editor?.contains(target)) {
			pillSessionActive = false;
			scheduleRefreshState();
			return;
		}

		closePill();
	}

	$effect(() => {
		void editor;
		void visible;

		function onSelectionChange() {
			scheduleRefreshState();
		}

		function onScroll() {
			scheduleRefreshState();
		}

		document.addEventListener('selectionchange', onSelectionChange);
		document.addEventListener('pointerdown', handleDocumentPointerDown, true);
		window.addEventListener('scroll', onScroll, true);
		refreshState();

		if (visible) {
			resizePill(!hasMeasured);
		}

		return () => {
			document.removeEventListener('selectionchange', onSelectionChange);
			document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
			window.removeEventListener('scroll', onScroll, true);
			if (refreshFrame) cancelAnimationFrame(refreshFrame);
		};
	});
</script>

{#if visible && editor}
	<div
		bind:this={pillRootEl}
		class="selection-pill no-print"
		role="toolbar"
		tabindex="-1"
		aria-label="Formatage de la sélection"
		style:top="{pillTop}px"
		style:left="{pillLeft}px"
		onpointerdown={handlePillPointerDown}
	>
		<div
			bind:this={pillCardEl}
			class="pill-card t-resize"
			class:is-color-mode={panelMode !== 'tools'}
			data-mode={panelMode}
		>
			<div bind:this={contentEl} class="pill-content">
				{#if panelMode === 'tools'}
					<div class="pill-row">
						<button
							type="button"
							class="pill-btn"
							class:is-active={boldActive}
							aria-label="Gras"
							aria-pressed={boldActive}
							onmousedown={(e) => e.preventDefault()}
							onclick={handleBold}
						>
							<Bold />
							{#if boldActive}<span class="active-dot"></span>{/if}
						</button>

						<button
							type="button"
							class="pill-btn"
							class:is-active={italicActive}
							aria-label="Italique"
							aria-pressed={italicActive}
							onmousedown={(e) => e.preventDefault()}
							onclick={handleItalic}
						>
							<Italic />
							{#if italicActive}<span class="active-dot"></span>{/if}
						</button>

						<button
							type="button"
							class="pill-btn"
							class:is-active={underlineActive}
							aria-label="Souligné"
							aria-pressed={underlineActive}
							onmousedown={(e) => e.preventDefault()}
							onclick={handleUnderline}
						>
							<Underline />
							{#if underlineActive}<span class="active-dot"></span>{/if}
						</button>

						<button
							type="button"
							class="pill-btn"
							class:is-active={codeActive}
							aria-label="Code"
							aria-pressed={codeActive}
							onmousedown={(e) => e.preventDefault()}
							onclick={handleCode}
						>
							<IconStack state={codeIconState} items={[...codeIcons]} />
							{#if codeActive}<span class="active-dot"></span>{/if}
						</button>

						<span class="pill-separator" aria-hidden="true"></span>

						<button
							type="button"
							class="pill-btn"
							class:is-active={textAlign !== 'left'}
							aria-label="Alignement du texte"
							onmousedown={(e) => e.preventDefault()}
							onclick={handleAlign}
						>
							<IconStack state={textAlign} items={[...alignIcons]} />
							{#if textAlign !== 'left'}<span class="active-dot"></span>{/if}
						</button>

						<button
							type="button"
							class="pill-btn"
							class:is-active={!!listStyle}
							aria-label={listStyle ? 'Changer le type de liste' : 'Ajouter une liste'}
							onmousedown={(e) => e.preventDefault()}
							onclick={handleList}
						>
							<IconStack state={listIconState} items={[...listIcons]} />
							{#if listStyle}<span class="active-dot"></span>{/if}
						</button>

						<span class="pill-separator" aria-hidden="true"></span>

						<button
							type="button"
							class="pill-btn"
							class:is-active={!!textColor}
							aria-label="Couleur du texte"
							onmousedown={(e) => e.preventDefault()}
							onclick={() => openPanel('text-color')}
						>
							<Palette />
							{#if textColor}<span class="active-dot" style:background="var({textColor})"
								></span>{/if}
						</button>

						<button
							type="button"
							class="pill-btn"
							class:is-active={!!highlightColor}
							aria-label="Surlignage"
							onmousedown={(e) => e.preventDefault()}
							onclick={() => openPanel('highlight')}
						>
							<Highlighter />
							{#if highlightColor}<span class="active-dot" style:background="var({highlightColor})"
								></span>{/if}
						</button>
					</div>
				{:else if panelMode === 'text-color'}
					<div class="pill-color-panel" aria-label="Choisir une couleur de texte">
						<button
							type="button"
							class="pill-btn"
							aria-label="Retour"
							onmousedown={(e) => e.preventDefault()}
							onclick={backToTools}
						>
							<ArrowLeft />
						</button>
						<div class="color-pills">
							{#each TEXT_COLOR_VARS as colorVar (colorVar)}
								<button
									type="button"
									class="color-pill"
									class:color-pill-white={colorVar === '--color-white'}
									class:is-selected={textColor === colorVar}
									style:background="var({colorVar})"
									aria-label="Couleur {colorVar}"
									aria-pressed={textColor === colorVar}
									onmousedown={(e) => e.preventDefault()}
									onclick={() => handleTextColor(colorVar)}
								></button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="pill-color-panel" aria-label="Choisir une couleur de surlignage">
						<button
							type="button"
							class="pill-btn"
							aria-label="Retour"
							onmousedown={(e) => e.preventDefault()}
							onclick={backToTools}
						>
							<ArrowLeft />
						</button>
						<div class="color-pills">
							{#each HIGHLIGHT_COLOR_VARS as colorVar (colorVar)}
								<button
									type="button"
									class="color-pill color-pill-highlight"
									class:is-selected={highlightColor === colorVar}
									style:background="var({colorVar})"
									aria-label="Surlignage {colorVar}"
									aria-pressed={highlightColor === colorVar}
									onmousedown={(e) => e.preventDefault()}
									onclick={() => handleHighlight(colorVar)}
								></button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.selection-pill {
		position: fixed;
		z-index: 60;
		transform: translate(-50%, calc(-100% - 0.625rem));
		pointer-events: auto;
		animation: pill-enter var(--ui-state-dur) var(--ui-state-ease);
	}

	@keyframes pill-enter {
		from {
			opacity: 0;
			transform: translate(-50%, calc(-100% - 0.375rem)) scale(0.97);
		}

		to {
			opacity: 1;
			transform: translate(-50%, calc(-100% - 0.625rem)) scale(1);
		}
	}

	.pill-card {
		overflow: hidden;
		border: 1px solid oklch(0.72 0 0 / 0.35);
		border-radius: 9999px;
		background: oklch(1 0 0 / 0.96);
		backdrop-filter: blur(10px);
		box-shadow:
			0 1px 1px oklch(0.45 0 0 / 0.04),
			0 4px 12px oklch(0.45 0 0 / 0.08),
			0 12px 28px oklch(0.45 0 0 / 0.06);
	}

	.pill-content {
		width: max-content;
	}

	.pill-row,
	.pill-color-panel {
		display: flex;
		align-items: center;
		gap: 0.125rem;
		padding: 0.3125rem 0.4375rem;
	}

	.pill-color-panel {
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
	}

	.pill-separator {
		width: 1px;
		height: 1rem;
		margin: 0 0.125rem;
		background: oklch(0.82 0 0 / 0.9);
	}

	.pill-btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: 9999px;
		background: transparent;
		color: oklch(0.42 0 0);
		cursor: pointer;
		transition:
			background var(--ui-press-dur) var(--ui-press-ease),
			color var(--ui-press-dur) var(--ui-press-ease),
			transform var(--ui-press-dur) var(--ui-press-ease);
		flex-shrink: 0;
	}

	.pill-btn::before {
		content: '';
		position: absolute;
		inset: -0.1875rem;
		border-radius: inherit;
	}

	.pill-btn :global(svg) {
		width: 0.875rem;
		height: 0.875rem;
	}

	.pill-btn:hover {
		background: oklch(0.96 0 0);
	}

	.pill-btn:active {
		transform: scale(0.94);
	}

	.pill-btn.is-active {
		background: oklch(0.95 0 0);
		color: oklch(0.32 0 0);
	}

	.active-dot {
		position: absolute;
		bottom: 0.1875rem;
		left: 50%;
		width: 0.25rem;
		height: 0.25rem;
		border-radius: 9999px;
		background: oklch(0.58 0 0);
		transform: translateX(-50%);
		transition: background var(--ui-press-dur) var(--ui-press-ease);
	}

	.color-pills {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.color-pill {
		position: relative;
		width: 1.25rem;
		height: 1.25rem;
		border: 1.5px solid oklch(0.78 0 0 / 0.5);
		border-radius: 9999px;
		cursor: pointer;
		transition:
			transform var(--ui-press-dur) var(--ui-press-ease),
			border-color var(--ui-press-dur) var(--ui-press-ease),
			box-shadow var(--ui-press-dur) var(--ui-press-ease);
		flex-shrink: 0;
	}

	.color-pill::before {
		content: '';
		position: absolute;
		inset: -0.25rem;
		border-radius: inherit;
	}

	.color-pill:hover {
		transform: scale(1.08);
	}

	.color-pill:active {
		transform: scale(0.94);
	}

	.color-pill.is-selected {
		border-color: oklch(0.52 0 0);
		box-shadow: 0 0 0 2px oklch(1 0 0);
	}

	.color-pill-white {
		background: #ffffff !important;
		box-shadow: inset 0 0 0 1px oklch(0.78 0 0 / 0.45);
	}

	.color-pill-highlight {
		box-shadow: inset 0 0 0 1px oklch(0.75 0 0 / 0.28);
	}

	@media (prefers-reduced-motion: reduce) {
		.selection-pill {
			animation: none;
		}

		.pill-btn,
		.color-pill,
		.active-dot {
			transition: none;
		}
	}
</style>
