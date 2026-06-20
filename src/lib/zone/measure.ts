import { htmlToPlainLines } from '$lib/editor/html.js';
import { sanitizeEditorHtml } from '$lib/editor/sanitize.js';
import { MIN_ZONE_LINES, type WriteZone } from './types.js';

export function isZoneEmpty(content: string): boolean {
	if (!content) return true;
	const text = htmlToPlainLines(content)
		.replace(/\u200b/g, '')
		.trim();
	return text.length === 0;
}

function isEditorContentEmpty(editor: HTMLElement): boolean {
	const raw = editor.innerText.replace(/\u200b/g, '');
	if (raw.trim()) return false;
	return isZoneEmpty(sanitizeEditorHtml(editor.innerHTML));
}

function getEditorLineHeightPx(editor: HTMLElement): number {
	if (typeof getComputedStyle === 'function') {
		const parsed = parseFloat(getComputedStyle(editor).lineHeight);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	}
	return editor.clientHeight / Math.max(MIN_ZONE_LINES, 1);
}

/** Mesure les lignes réellement occupées par le contenu (sans tenir compte de la taille actuelle de la zone). */
export function measureContentLineCount(editor: HTMLElement): number {
	const raw = editor.innerText.replace(/\u200b/g, '');
	if (!raw.trim()) return MIN_ZONE_LINES;

	const explicitLines = Math.max(1, raw.split('\n').length);
	if (raw.includes('\n')) return explicitLines;

	const lineHeightPx = getEditorLineHeightPx(editor);
	if (!Number.isFinite(lineHeightPx) || lineHeightPx <= 0) return MIN_ZONE_LINES;

	return Math.max(MIN_ZONE_LINES, Math.ceil(editor.scrollHeight / lineHeightPx));
}

export function measureEditorLineCount(editor: HTMLElement, currentLineCount: number): number {
	const raw = editor.innerText.replace(/\u200b/g, '');

	if (!raw.trim()) {
		return Math.max(MIN_ZONE_LINES, currentLineCount);
	}

	const explicitLines = Math.max(1, raw.split('\n').length);
	const measured = Math.max(currentLineCount, explicitLines);

	if (raw.includes('\n')) {
		return measured;
	}

	const lineHeightPx = editor.clientHeight / Math.max(currentLineCount, MIN_ZONE_LINES);
	if (
		Number.isFinite(lineHeightPx) &&
		lineHeightPx > 0 &&
		editor.scrollHeight > editor.clientHeight + 1
	) {
		const scrollLines = Math.ceil(editor.scrollHeight / lineHeightPx);
		return Math.max(measured, scrollLines);
	}

	return measured;
}

/** Nombre minimal de lignes requis par le contenu actuel d'une zone. */
export function measureZoneMinLineCount(zone: WriteZone, editor?: HTMLElement | null): number {
	if (editor && !isEditorContentEmpty(editor)) {
		return measureContentLineCount(editor);
	}

	if (!isZoneEmpty(zone.content)) {
		const text = htmlToPlainLines(zone.content).replace(/\u200b/g, '');
		return Math.max(MIN_ZONE_LINES, Math.max(1, text.split('\n').length));
	}

	return MIN_ZONE_LINES;
}
