import { plainLinesToHtml } from '$lib/editor/html.js';
import { createWriteZone } from '$lib/zone/factory.js';
import { clampLineCount, getMaxLinesForZone } from '$lib/zone/geometry.js';
import { MIN_ZONE_LINES } from '$lib/zone/types.js';
import type { BristolLayout } from '$lib/bristol/layout.js';
import type { WriteZone } from '$lib/zone/types.js';
import { splitOverflowText } from './split-text.js';

export function splitZoneEditorOverflow(
	editor: HTMLElement,
	maxLines: number
): { current: string; overflow: string; lineCount: number } {
	const originalHtml = editor.innerHTML;
	const plainText = editor.innerText;

	const byNewline = splitOverflowText(plainText, maxLines);
	if (byNewline.overflow) {
		editor.innerHTML = plainLinesToHtml(byNewline.current);
		const lineCount = Math.max(MIN_ZONE_LINES, byNewline.current.split('\n').length);
		return { current: editor.innerHTML, overflow: byNewline.overflow, lineCount };
	}

	if (editor.scrollHeight <= editor.clientHeight + 1) {
		const lineCount = Math.max(MIN_ZONE_LINES, plainText.split('\n').filter(Boolean).length || 1);
		return { current: originalHtml, overflow: '', lineCount };
	}

	let low = 0;
	let high = plainText.length;
	let best = 0;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		editor.innerHTML = plainLinesToHtml(plainText.slice(0, mid));

		if (editor.scrollHeight <= editor.clientHeight + 1) {
			best = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	let splitAt = best;
	const lastBreak = plainText.lastIndexOf('\n', best);
	if (lastBreak >= 0) {
		splitAt = lastBreak + 1;
	} else {
		const lastSpace = plainText.lastIndexOf(' ', best);
		if (lastSpace > 0) splitAt = lastSpace + 1;
	}

	const currentText = plainText.slice(0, splitAt).replace(/\n$/, '');
	const overflowText = plainText.slice(splitAt);

	editor.innerHTML = plainLinesToHtml(currentText);
	const lineCount = Math.max(MIN_ZONE_LINES, currentText.split('\n').length || 1);

	return { current: editor.innerHTML, overflow: overflowText, lineCount };
}

export function mergeZoneContent(zone: WriteZone, content: string, lineCount: number): WriteZone {
	return { ...zone, content, lineCount };
}

export function createContinuationZone(
	source: WriteZone,
	overflowContent: string,
	overflowLineCount: number,
	startLineIndex = 1
): WriteZone {
	return createWriteZone({
		lineIndex: startLineIndex,
		leftCm: source.leftCm,
		widthCm: source.widthCm,
		lineCount: Math.max(1, overflowLineCount),
		content: plainLinesToHtml(overflowContent)
	});
}

export function getZoneMaxLines(zone: WriteZone, layout: BristolLayout): number {
	return getMaxLinesForZone(zone.lineIndex, layout);
}

export function clampZoneLineCount(zone: WriteZone, layout: BristolLayout): WriteZone {
	return {
		...zone,
		lineCount: clampLineCount(zone.lineCount, zone.lineIndex, layout)
	};
}
