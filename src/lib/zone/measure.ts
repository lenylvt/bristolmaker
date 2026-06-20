import { htmlToPlainLines } from '$lib/editor/html.js';
import { MIN_ZONE_LINES, type WriteZone } from './types.js';

export function isZoneEmpty(content: string): boolean {
	if (!content) return true;
	const text = htmlToPlainLines(content)
		.replace(/\u200b/g, '')
		.trim();
	return text.length === 0;
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
	if (editor) {
		const raw = editor.innerText.replace(/\u200b/g, '');
		if (raw.trim()) {
			return measureEditorLineCount(editor, zone.lineCount);
		}
	}

	if (isZoneEmpty(zone.content)) {
		return MIN_ZONE_LINES;
	}

	const text = htmlToPlainLines(zone.content).replace(/\u200b/g, '');
	return Math.max(MIN_ZONE_LINES, Math.max(1, text.split('\n').length));
}
