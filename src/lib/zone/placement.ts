import { getWritableLines, buildBristolLayout, type BristolLayout } from '$lib/bristol/layout.js';
import { clampLeftCm, clampWidthCm, round } from './geometry.js';
import { createWriteZone } from './factory.js';
import {
	DEFAULT_ZONE_WIDTH_CM,
	MIN_ZONE_LINES,
	type WriteZone,
	type ZonePlacement
} from './types.js';

type HorizontalSpan = {
	leftCm: number;
	rightCm: number;
};

function spansOverlap(leftCm: number, widthCm: number, spans: HorizontalSpan[]): boolean {
	const rightCm = leftCm + widthCm;

	for (const span of spans) {
		if (leftCm < span.rightCm - 1e-9 && rightCm > span.leftCm + 1e-9) {
			return true;
		}
	}

	return false;
}

export function findHorizontalGapOnLine(
	spans: HorizontalSpan[],
	widthCm: number,
	sheetWidthCm: number
): number | null {
	if (spans.length === 0) return 0;

	const sorted = [...spans].sort((a, b) => a.leftCm - b.leftCm);

	if (sorted[0].leftCm >= widthCm - 1e-9 && !spansOverlap(0, widthCm, sorted)) {
		return 0;
	}

	for (let index = 0; index < sorted.length - 1; index++) {
		const gapStart = sorted[index].rightCm;
		const gapEnd = sorted[index + 1].leftCm;

		if (gapEnd - gapStart < widthCm - 1e-9) continue;
		if (spansOverlap(gapStart, widthCm, sorted)) continue;

		return round(gapStart);
	}

	const lastRight = sorted.at(-1)?.rightCm ?? 0;
	if (sheetWidthCm - lastRight < widthCm - 1e-9) return null;

	const leftCm = clampLeftCm(lastRight, widthCm, sheetWidthCm);
	if (spansOverlap(leftCm, widthCm, sorted)) return null;

	return leftCm;
}

export function getMaxOccupiedLineIndex(zones: WriteZone[]): number {
	let maxLine = 0;

	for (const zone of zones) {
		const bottomLine = zone.lineIndex + zone.lineCount - 1;
		maxLine = Math.max(maxLine, bottomLine);
	}

	return maxLine;
}

export function isLineOccupiedByZone(zones: WriteZone[], lineIndex: number): boolean {
	return zones.some(
		(zone) => lineIndex >= zone.lineIndex && lineIndex < zone.lineIndex + zone.lineCount
	);
}

export function findNextZonePlacement(
	zones: WriteZone[],
	layout: BristolLayout,
	lineCount = MIN_ZONE_LINES
): ZonePlacement | null {
	const writable = getWritableLines(layout);
	const minLineIndex = getMaxOccupiedLineIndex(zones) + 1;

	for (const line of writable) {
		if (line.index < minLineIndex) continue;
		if (line.index + lineCount - 1 > writable.length) continue;

		let free = true;

		for (let lineIndex = line.index; lineIndex < line.index + lineCount; lineIndex++) {
			if (isLineOccupiedByZone(zones, lineIndex)) {
				free = false;
				break;
			}
		}

		if (free) {
			return { lineIndex: line.index, leftCm: 0 };
		}
	}

	return null;
}

export function getOccupiedLineIndices(zones: WriteZone[]): Set<number> {
	const occupied = new Set<number>();

	for (const zone of zones) {
		for (let line = zone.lineIndex; line < zone.lineIndex + zone.lineCount; line++) {
			occupied.add(line);
		}
	}

	return occupied;
}

export function findNextFreeLineIndex(
	zones: WriteZone[],
	layout: BristolLayout,
	startFromLine = 1
): number | null {
	const placement = findNextZonePlacement(zones, layout);
	if (!placement || placement.lineIndex < startFromLine) return null;

	return placement.lineIndex;
}

export function createZoneOnLine(lineIndex: number, sheetWidthCm: number, leftCm = 0): WriteZone {
	const widthCm = clampWidthCm(leftCm, DEFAULT_ZONE_WIDTH_CM, sheetWidthCm);

	return createWriteZone({
		lineIndex,
		leftCm: clampLeftCm(leftCm, widthCm, sheetWidthCm),
		widthCm
	});
}

export function defaultLayout(): BristolLayout {
	return buildBristolLayout();
}
