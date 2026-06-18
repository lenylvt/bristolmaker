import { TEXT_COLOR_VARS, type ListStyle, type TextColorVar } from '../colors.js';
import { listStyleClass } from '../shortcuts.js';

export const LIST_CYCLE = ['dash', 'decimal', 'roman'] as const satisfies readonly ListStyle[];

export const TEXT_ALIGN_CYCLE = ['left', 'center', 'right', 'justify'] as const;
export type TextAlign = (typeof TEXT_ALIGN_CYCLE)[number];

const COLOR_VAR_RE = /var\((--color-[\w-]+)\)/;

export function queryFormatState(command: 'bold' | 'italic' | 'underline'): boolean {
	return document.queryCommandState(command);
}

export function toggleFormat(command: 'bold' | 'italic' | 'underline'): void {
	document.execCommand(command, false);
}

export function getActiveTextAlign(editor: HTMLElement): TextAlign {
	editor.focus();
	if (document.queryCommandState('justifyFull')) return 'justify';
	if (document.queryCommandState('justifyRight')) return 'right';
	if (document.queryCommandState('justifyCenter')) return 'center';
	return 'left';
}

export function nextTextAlign(current: TextAlign): TextAlign {
	const index = TEXT_ALIGN_CYCLE.indexOf(current);
	return TEXT_ALIGN_CYCLE[(index + 1) % TEXT_ALIGN_CYCLE.length] ?? 'left';
}

export function applyTextAlign(editor: HTMLElement, align: TextAlign): void {
	editor.focus();
	const commands: Record<TextAlign, string> = {
		left: 'justifyLeft',
		center: 'justifyCenter',
		right: 'justifyRight',
		justify: 'justifyFull'
	};
	document.execCommand(commands[align], false);
}

export function cycleTextAlign(editor: HTMLElement): TextAlign {
	const next = nextTextAlign(getActiveTextAlign(editor));
	applyTextAlign(editor, next);
	return next;
}

export function applyBold(editor: HTMLElement): void {
	editor.focus();
	document.execCommand('bold', false);
}

export function applyItalic(editor: HTMLElement): void {
	editor.focus();
	document.execCommand('italic', false);
}

export function applyUnderline(editor: HTMLElement): void {
	editor.focus();
	document.execCommand('underline', false);
}

export function applyCode(editor: HTMLElement): void {
	wrapSelection(editor, 'code', '');
}

export function toggleCode(editor: HTMLElement): void {
	editor.focus();
	if (queryCodeState(editor)) {
		unwrapMatchingInSelection(editor, (el) => el.tagName === 'CODE');
	} else {
		applyCode(editor);
	}
}

export function queryCodeState(editor: HTMLElement): boolean {
	return !!findAncestor(editor, (el) => el.tagName === 'CODE');
}

export function parseTextColorVar(style: string): TextColorVar | null {
	const match = COLOR_VAR_RE.exec(style);
	if (!match?.[1]) return null;
	return TEXT_COLOR_VARS.includes(match[1] as TextColorVar) ? (match[1] as TextColorVar) : null;
}

export function parseHighlightColorVar(style: string): TextColorVar | null {
	const match = /background-color:\s*var\((--color-[\w-]+)\)/.exec(style);
	if (!match?.[1]) return null;
	return TEXT_COLOR_VARS.includes(match[1] as TextColorVar) ? (match[1] as TextColorVar) : null;
}

export function getActiveTextColor(editor: HTMLElement): TextColorVar | null {
	const el = findAncestor(editor, (node) => {
		if (node.tagName !== 'SPAN') return false;
		return parseTextColorVar(node.getAttribute('style') ?? '') !== null;
	});
	if (!el) return null;
	return parseTextColorVar(el.getAttribute('style') ?? '');
}

export function getActiveHighlight(editor: HTMLElement): TextColorVar | null {
	const el = findAncestor(editor, (node) => {
		if (node.tagName !== 'MARK') return false;
		return parseHighlightColorVar(node.getAttribute('style') ?? '') !== null;
	});
	if (!el) return null;
	return parseHighlightColorVar(el.getAttribute('style') ?? '');
}

export function toggleTextColor(editor: HTMLElement, colorVar: TextColorVar): void {
	editor.focus();
	const active = getActiveTextColor(editor);

	if (active === colorVar) {
		unwrapMatchingInSelection(editor, isColorSpan);
		return;
	}

	if (replaceColorStyleInSelection(editor, colorVar, 'text')) {
		return;
	}

	wrapSelection(editor, 'span', textColorStyle(colorVar));
}

export function toggleHighlight(editor: HTMLElement, colorVar: TextColorVar): void {
	editor.focus();
	const active = getActiveHighlight(editor);

	if (active === colorVar) {
		unwrapMatchingInSelection(editor, isHighlightMark);
		return;
	}

	if (replaceColorStyleInSelection(editor, colorVar, 'highlight')) {
		return;
	}

	wrapSelection(editor, 'mark', highlightColorStyle(colorVar));
}

export function applyTextColor(editor: HTMLElement, colorVar: TextColorVar): void {
	toggleTextColor(editor, colorVar);
}

export function applyHighlight(editor: HTMLElement, colorVar: TextColorVar): void {
	toggleHighlight(editor, colorVar);
}

export function getActiveListStyle(editor: HTMLElement): ListStyle | null {
	const list = getClosestList(editor);
	if (!list) return null;

	for (const style of LIST_CYCLE) {
		if (list.classList.contains(listStyleClass(style))) return style;
	}

	if (list.tagName === 'OL') {
		return list.classList.contains('list-roman') ? 'roman' : 'decimal';
	}

	return 'dash';
}

export function normalizeListStyle(style: ListStyle): ListStyle {
	return style === 'star' ? 'dash' : style;
}

export function nextListStyle(current: ListStyle | null): ListStyle | null {
	if (!current) return LIST_CYCLE[0];

	const normalized = normalizeListStyle(current);
	const index = LIST_CYCLE.indexOf(normalized as (typeof LIST_CYCLE)[number]);
	if (index === -1) return LIST_CYCLE[0];
	if (index >= LIST_CYCLE.length - 1) return null;
	return LIST_CYCLE[index + 1];
}

export function applyList(editor: HTMLElement, style: ListStyle): void {
	editor.focus();
	const normalized = normalizeListStyle(style);
	const isOrdered = normalized === 'decimal' || normalized === 'roman';
	document.execCommand(isOrdered ? 'insertOrderedList' : 'insertUnorderedList');

	const list = getClosestList(editor);
	if (!list) return;

	list.className = listStyleClass(normalized);
}

export function removeList(editor: HTMLElement): void {
	editor.focus();
	const list = getClosestList(editor);
	if (!list) return;

	const isOrdered = list.tagName === 'OL';
	document.execCommand(isOrdered ? 'insertOrderedList' : 'insertUnorderedList');
}

export function cycleListStyle(editor: HTMLElement): void {
	editor.focus();
	const active = getActiveListStyle(editor);
	const next = nextListStyle(active);

	if (!next) {
		removeList(editor);
		return;
	}

	if (active) {
		convertListType(editor, next);
	} else {
		applyList(editor, next);
	}
}

export function toggleListOff(editor: HTMLElement): void {
	if (getActiveListStyle(editor)) {
		removeList(editor);
	} else {
		cycleListStyle(editor);
	}
}

export function isInList(editor: HTMLElement): boolean {
	return getActiveListStyle(editor) !== null;
}

const SEL_START = 'bristol-sel-start';
const SEL_END = 'bristol-sel-end';

export function hasEditorSelection(editor: HTMLElement): boolean {
	const selection = window.getSelection();
	if (!selection || selection.isCollapsed) return false;
	return editor.contains(selection.anchorNode);
}

export function saveEditorSelection(editor: HTMLElement): Range | null {
	const selection = window.getSelection();
	if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return null;

	const range = selection.getRangeAt(0);
	if (range.collapsed) return null;

	return range.cloneRange();
}

export function restoreEditorSelection(editor: HTMLElement, saved: Range | null): boolean {
	if (!saved) return false;

	editor.focus();
	const selection = window.getSelection();
	if (!selection) return false;

	try {
		if (!editor.contains(saved.commonAncestorContainer)) {
			return selectFocusedBlock(editor);
		}

		selection.removeAllRanges();
		selection.addRange(saved);
		return !selection.isCollapsed;
	} catch {
		return selectFocusedBlock(editor);
	}
}

export function bookmarkEditorSelection(editor: HTMLElement): (() => boolean) | null {
	const selection = window.getSelection();
	if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return null;

	const range = selection.getRangeAt(0);
	if (range.collapsed) return null;

	const endMarker = document.createComment(SEL_END);
	const endInsert = range.cloneRange();
	endInsert.collapse(false);
	endInsert.insertNode(endMarker);

	const startMarker = document.createComment(SEL_START);
	const startInsert = range.cloneRange();
	startInsert.collapse(true);
	startInsert.insertNode(startMarker);

	return () => restoreBookmarkedSelection(editor, startMarker, endMarker);
}

export function withPreservedEditorSelection(editor: HTMLElement, action: () => void): void {
	const saved = saveEditorSelection(editor);

	editor.focus();
	if (saved) {
		restoreEditorSelection(editor, saved);
	}

	try {
		action();
	} finally {
		editor.focus();
		const updated = saveEditorSelection(editor);
		if (updated) {
			restoreEditorSelection(editor, updated);
			return;
		}

		if (saved) {
			const restored = restoreEditorSelection(editor, saved.cloneRange());
			if (!restored) {
				selectFocusedBlock(editor);
			}
		}
	}
}

export function getSelectionRect(editor: HTMLElement): DOMRect | null {
	const selection = window.getSelection();
	if (!selection || selection.isCollapsed || !editor.contains(selection.anchorNode)) {
		return null;
	}

	const range = selection.getRangeAt(0);
	const rects = range.getClientRects();

	if (rects.length > 0) {
		let top = Infinity;
		let left = Infinity;
		let bottom = -Infinity;
		let right = -Infinity;
		let hasArea = false;

		for (const rect of rects) {
			if (rect.width === 0 && rect.height === 0) continue;
			hasArea = true;
			top = Math.min(top, rect.top);
			left = Math.min(left, rect.left);
			bottom = Math.max(bottom, rect.bottom);
			right = Math.max(right, rect.right);
		}

		if (hasArea) {
			return new DOMRect(left, top, right - left, bottom - top);
		}
	}

	const rect = range.getBoundingClientRect();
	if (rect.width > 0 || rect.height > 0) return rect;

	const caret = range.cloneRange();
	caret.collapse(true);
	const caretRect = caret.getBoundingClientRect();
	if (caretRect.width > 0 || caretRect.height > 0) return caretRect;

	return null;
}

export function getLinePrefixAtCursor(editor: HTMLElement): string {
	const selection = window.getSelection();
	if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return '';

	const cursor = selection.getRangeAt(0).cloneRange();
	cursor.collapse(true);

	const prefixRange = document.createRange();
	prefixRange.selectNodeContents(editor);
	prefixRange.setEnd(cursor.startContainer, cursor.startOffset);

	const text = prefixRange.toString();
	const lineStart = Math.max(text.lastIndexOf('\n') + 1, 0);
	return text.slice(lineStart);
}

export function tryAutoList(editor: HTMLElement): boolean {
	const prefix = getLinePrefixAtCursor(editor);
	if (prefix !== '- ' && prefix !== '* ') return false;

	editor.focus();
	const selection = window.getSelection();
	if (!selection?.rangeCount) return false;

	const range = selection.getRangeAt(0);
	range.setStart(range.startContainer, range.startOffset - 2);
	range.deleteContents();
	applyList(editor, 'dash');
	return true;
}

export function insertLineBreak(editor: HTMLElement): void {
	editor.focus();
	document.execCommand('insertLineBreak', false);
}

function convertListType(editor: HTMLElement, style: ListStyle): void {
	const list = getClosestList(editor);
	if (!list) {
		applyList(editor, style);
		return;
	}

	const normalized = normalizeListStyle(style);
	const wantsOrdered = normalized === 'decimal' || normalized === 'roman';
	const isOrdered = list.tagName === 'OL';

	if (wantsOrdered !== isOrdered) {
		document.execCommand(wantsOrdered ? 'insertOrderedList' : 'insertUnorderedList');
	}

	const updated = getClosestList(editor);
	if (updated) {
		updated.className = listStyleClass(normalized);
	}
}

function isColorSpan(el: HTMLElement): boolean {
	return el.tagName === 'SPAN' && parseTextColorVar(el.getAttribute('style') ?? '') !== null;
}

function isHighlightMark(el: HTMLElement): boolean {
	return el.tagName === 'MARK' && parseHighlightColorVar(el.getAttribute('style') ?? '') !== null;
}

export function textColorStyle(colorVar: TextColorVar): string {
	return `color: var(${colorVar})`;
}

export function highlightColorStyle(colorVar: TextColorVar): string {
	return `background-color: var(${colorVar}); color: inherit;`;
}

function replaceColorStyleInSelection(
	editor: HTMLElement,
	colorVar: TextColorVar,
	kind: 'text' | 'highlight'
): boolean {
	const selection = window.getSelection();
	if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return false;

	const matcher = kind === 'text' ? isColorSpan : isHighlightMark;
	const style = kind === 'text' ? textColorStyle(colorVar) : highlightColorStyle(colorVar);
	const tag = kind === 'text' ? 'span' : 'mark';
	const range = selection.getRangeAt(0);

	if (range.collapsed) {
		const ancestor = findAncestor(editor, matcher);
		if (!ancestor) return false;
		ancestor.setAttribute('style', style);
		return true;
	}

	const root =
		range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
			? (range.commonAncestorContainer as HTMLElement)
			: range.commonAncestorContainer.parentElement;

	if (!root) return false;

	let updated = false;
	for (const el of root.querySelectorAll(tag)) {
		if (!(el instanceof HTMLElement) || !matcher(el)) continue;
		if (!range.intersectsNode(el)) continue;
		el.setAttribute('style', style);
		updated = true;
	}

	const wrappingAncestor = findAncestor(editor, matcher);
	if (wrappingAncestor && range.intersectsNode(wrappingAncestor)) {
		wrappingAncestor.setAttribute('style', style);
		return true;
	}

	return updated;
}

function getClosestList(editor: HTMLElement): HTMLElement | null {
	const selection = window.getSelection();
	if (!selection?.anchorNode) return null;

	let node: Node | null = selection.anchorNode;
	while (node && node !== editor) {
		if (node instanceof HTMLElement && (node.tagName === 'UL' || node.tagName === 'OL')) {
			return node;
		}
		node = node.parentNode;
	}

	return null;
}

function findAncestor(
	editor: HTMLElement,
	matcher: (el: HTMLElement) => boolean
): HTMLElement | null {
	const selection = window.getSelection();
	if (!selection?.anchorNode || !editor.contains(selection.anchorNode)) return null;

	let node: Node | null = selection.anchorNode;
	while (node && node !== editor) {
		if (node instanceof HTMLElement && matcher(node)) return node;
		node = node.parentNode;
	}

	return null;
}

function unwrapMatchingInSelection(
	editor: HTMLElement,
	matcher: (el: HTMLElement) => boolean
): void {
	const selection = window.getSelection();
	if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return;

	const range = selection.getRangeAt(0);
	const root =
		range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
			? (range.commonAncestorContainer as HTMLElement)
			: range.commonAncestorContainer.parentElement;

	if (!root) return;

	const matches = root.querySelectorAll('span, mark, code');
	for (const el of matches) {
		if (!(el instanceof HTMLElement) || !matcher(el)) continue;
		if (!range.intersectsNode(el)) continue;
		unwrapElement(el);
	}

	const ancestor = findAncestor(editor, matcher);
	if (ancestor) unwrapElement(ancestor);
}

function unwrapElement(el: HTMLElement): void {
	const parent = el.parentNode;
	if (!parent) return;

	while (el.firstChild) {
		parent.insertBefore(el.firstChild, el);
	}
	parent.removeChild(el);
}

function wrapSelection(editor: HTMLElement, tag: string, style: string): void {
	editor.focus();
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	if (!editor.contains(range.commonAncestorContainer)) return;

	const wrapper = document.createElement(tag);
	if (style) wrapper.setAttribute('style', style);

	if (range.collapsed) {
		wrapper.appendChild(document.createTextNode('\u200b'));
		range.insertNode(wrapper);
		const innerRange = document.createRange();
		innerRange.selectNodeContents(wrapper);
		innerRange.collapse(false);
		selection.removeAllRanges();
		selection.addRange(innerRange);
		return;
	}

	try {
		range.surroundContents(wrapper);
	} catch {
		const fragment = range.extractContents();
		wrapper.appendChild(fragment);
		range.insertNode(wrapper);
	}

	const newRange = document.createRange();
	newRange.selectNodeContents(wrapper);
	selection.removeAllRanges();
	selection.addRange(newRange);
}

function selectFocusedBlock(editor: HTMLElement): boolean {
	const selection = window.getSelection();
	if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return false;

	const range = selection.getRangeAt(0);
	const block = findSelectableBlock(editor, range.startContainer);
	if (!block) return false;

	const newRange = document.createRange();
	newRange.selectNodeContents(block);
	selection.removeAllRanges();
	selection.addRange(newRange);
	return !selection.isCollapsed;
}

function findSelectableBlock(editor: HTMLElement, node: Node): HTMLElement | null {
	let current: Node | null = node;

	while (current && current !== editor) {
		if (current instanceof HTMLElement) {
			if (current.tagName === 'LI' || current.tagName === 'CODE') return current;
			if (['DIV', 'P'].includes(current.tagName)) return current;
		}
		current = current.parentNode;
	}

	return editor;
}

function findSelectionMarker(editor: HTMLElement, kind: string): Comment | null {
	const walker = document.createTreeWalker(editor, NodeFilter.SHOW_COMMENT);

	while (walker.nextNode()) {
		const node = walker.currentNode;
		if (node instanceof Comment && node.data === kind) return node;
	}

	return null;
}

function restoreBookmarkedSelection(
	editor: HTMLElement,
	startMarker: Comment,
	endMarker: Comment
): boolean {
	const start = editor.contains(startMarker) ? startMarker : findSelectionMarker(editor, SEL_START);
	const end = editor.contains(endMarker) ? endMarker : findSelectionMarker(editor, SEL_END);
	if (!start || !end) return false;

	const selection = window.getSelection();
	if (!selection) return false;

	try {
		const range = document.createRange();
		range.setStartAfter(start);
		range.setEndBefore(end);
		start.remove();
		end.remove();
		selection.removeAllRanges();
		selection.addRange(range);
		return !selection.isCollapsed;
	} catch {
		return false;
	}
}

export { htmlToPlainLines, plainLinesToHtml } from '../html.js';
