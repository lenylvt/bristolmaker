import { getWritableLines, type BristolLayout } from '$lib/bristol/layout.js';
import { MIN_ZONE_LINES, MIN_ZONE_WIDTH_CM, type SheetPointCm } from './types.js';

export function getZoneTopCm(lineIndex: number, layout: BristolLayout): number {
	const line = getWritableLines(layout)[lineIndex - 1];
	if (!line) return layout.headerLineCm;
	return round(line.positionCm - layout.specs.lineSpacingCm);
}

export function getZoneHeightCm(lineCount: number, layout: BristolLayout): number {
	return round(lineCount * layout.specs.lineSpacingCm);
}

export function snapYCmToLineIndex(yCm: number, layout: BristolLayout): number {
	const writable = getWritableLines(layout);
	const spacing = layout.specs.lineSpacingCm;

	let bestIndex = 1;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const [index, line] of writable.entries()) {
		const lineTopCm = line.positionCm - spacing;
		const distance = Math.abs(yCm - lineTopCm);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = index + 1;
		}
	}

	return bestIndex;
}

export function clampLeftCm(leftCm: number, widthCm: number, sheetWidthCm: number): number {
	const maxLeft = Math.max(0, sheetWidthCm - widthCm);
	return round(clamp(leftCm, 0, maxLeft));
}

export function clampWidthCm(
	leftCm: number,
	widthCm: number,
	sheetWidthCm: number,
	minWidthCm = MIN_ZONE_WIDTH_CM
): number {
	const maxWidth = Math.max(minWidthCm, sheetWidthCm - leftCm);
	return round(clamp(widthCm, minWidthCm, maxWidth));
}

export function getMaxLinesForZone(lineIndex: number, layout: BristolLayout): number {
	return Math.max(0, getWritableLines(layout).length - lineIndex + 1);
}

export function clampLineCount(
	lineCount: number,
	lineIndex: number,
	layout: BristolLayout
): number {
	const maxLines = getMaxLinesForZone(lineIndex, layout);
	return Math.max(MIN_ZONE_LINES, Math.min(lineCount, maxLines || MIN_ZONE_LINES));
}

export function clientToSheetCm(
	clientX: number,
	clientY: number,
	sheetRect: DOMRect,
	sheetWidthCm: number,
	sheetHeightCm: number
): SheetPointCm {
	return {
		xCm: round(((clientX - sheetRect.left) / sheetRect.width) * sheetWidthCm),
		yCm: round(((clientY - sheetRect.top) / sheetRect.height) * sheetHeightCm)
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}

export { clamp, round };
