import { getWritableLines, type BristolLayout } from '$lib/bristol/layout.js';
import { createWriteZone } from './factory.js';
import {
	clampLeftCm,
	clampLineCount,
	clampWidthCm,
	getMaxLinesForZone,
	round,
	snapYCmToLineIndex
} from './geometry.js';
import {
	DEFAULT_ZONE_WIDTH_CM,
	MIN_ZONE_LINES,
	type ArrowDirection,
	type ResizeHandle,
	type SheetPointCm,
	type WriteZone,
	type ZoneGeometry,
	ZONE_ARROW_STEP_CM
} from './types.js';

export function createZoneAtPoint(
	point: SheetPointCm,
	layout: BristolLayout,
	sheetWidthCm: number
): WriteZone {
	const lineIndex = snapYCmToLineIndex(point.yCm, layout);
	const widthCm = clampWidthCm(point.xCm, DEFAULT_ZONE_WIDTH_CM, sheetWidthCm);
	const leftCm = clampLeftCm(point.xCm, widthCm, sheetWidthCm);

	return createWriteZone({ lineIndex, leftCm, widthCm });
}

export function moveZoneWithGrab(
	origin: ZoneGeometry,
	pointer: SheetPointCm,
	grabOffset: SheetPointCm,
	layout: BristolLayout,
	sheetWidthCm: number
): ZoneGeometry {
	const targetTopCm = pointer.yCm - grabOffset.yCm;
	const lineIndex = snapYCmToLineIndex(targetTopCm, layout);
	const maxLines = getMaxLinesForZone(lineIndex, layout);
	const lineCount = Math.min(origin.lineCount, maxLines || MIN_ZONE_LINES);

	return {
		lineIndex,
		leftCm: clampLeftCm(pointer.xCm - grabOffset.xCm, origin.widthCm, sheetWidthCm),
		widthCm: origin.widthCm,
		lineCount: Math.max(MIN_ZONE_LINES, lineCount)
	};
}

export function moveZoneToPoint(
	zone: ZoneGeometry,
	point: SheetPointCm,
	layout: BristolLayout,
	sheetWidthCm: number
): ZoneGeometry {
	const lineIndex = snapYCmToLineIndex(point.yCm, layout);
	const maxLines = getMaxLinesForZone(lineIndex, layout);
	const lineCount = Math.min(zone.lineCount, maxLines || MIN_ZONE_LINES);

	return {
		lineIndex,
		leftCm: clampLeftCm(point.xCm, zone.widthCm, sheetWidthCm),
		widthCm: zone.widthCm,
		lineCount: Math.max(MIN_ZONE_LINES, lineCount)
	};
}

export function resizeZone(
	zone: ZoneGeometry,
	handle: ResizeHandle,
	delta: SheetPointCm,
	layout: BristolLayout,
	sheetWidthCm: number
): ZoneGeometry {
	let { lineIndex, leftCm, widthCm, lineCount } = zone;
	const spacing = layout.specs.lineSpacingCm;
	const deltaLines = Math.round(delta.yCm / spacing);
	const writableCount = getWritableLines(layout).length;

	if (handle.includes('e')) {
		widthCm = clampWidthCm(leftCm, widthCm + delta.xCm, sheetWidthCm);
	}

	if (handle.includes('w')) {
		const nextLeft = leftCm + delta.xCm;
		const nextWidth = widthCm - delta.xCm;
		const clampedWidth = clampWidthCm(nextLeft, nextWidth, sheetWidthCm);
		const clampedLeft = clampLeftCm(nextLeft, clampedWidth, sheetWidthCm);
		leftCm = clampedLeft;
		widthCm = clampedWidth;
	}

	if (handle === 's' || handle === 'se' || handle === 'sw') {
		const maxLines = getMaxLinesForZone(lineIndex, layout);
		lineCount = clamp(lineCount + deltaLines, MIN_ZONE_LINES, maxLines || MIN_ZONE_LINES);
	}

	if (handle === 'n' || handle === 'ne' || handle === 'nw') {
		const nextLineIndex = clamp(lineIndex + deltaLines, 1, writableCount);
		const bottomLine = lineIndex + lineCount - 1;
		const nextLineCount = bottomLine - nextLineIndex + 1;
		if (nextLineCount >= MIN_ZONE_LINES) {
			lineIndex = nextLineIndex;
			lineCount = nextLineCount;
		}
	}

	return {
		lineIndex,
		leftCm: round(leftCm),
		widthCm: round(widthCm),
		lineCount: clampLineCount(lineCount, lineIndex, layout)
	};
}

export function moveZoneByArrow(
	zone: ZoneGeometry,
	direction: ArrowDirection,
	layout: BristolLayout,
	sheetWidthCm: number,
	stepCm = ZONE_ARROW_STEP_CM
): ZoneGeometry {
	const writableCount = getWritableLines(layout).length;

	if (direction === 'left') {
		return {
			...zone,
			leftCm: clampLeftCm(zone.leftCm - stepCm, zone.widthCm, sheetWidthCm)
		};
	}

	if (direction === 'right') {
		return {
			...zone,
			leftCm: clampLeftCm(zone.leftCm + stepCm, zone.widthCm, sheetWidthCm)
		};
	}

	const nextLineIndex =
		direction === 'up'
			? clamp(zone.lineIndex - 1, 1, writableCount)
			: clamp(zone.lineIndex + 1, 1, writableCount);
	const maxLines = getMaxLinesForZone(nextLineIndex, layout);
	const lineCount = Math.min(zone.lineCount, maxLines || MIN_ZONE_LINES);

	return {
		lineIndex: nextLineIndex,
		leftCm: clampLeftCm(zone.leftCm, zone.widthCm, sheetWidthCm),
		widthCm: zone.widthCm,
		lineCount: clampLineCount(lineCount, nextLineIndex, layout)
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
