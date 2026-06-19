import { describe, expect, it } from 'vitest';
import { buildBristolLayout } from '$lib/bristol/layout.js';
import {
	clampLeftCm,
	clampLineCount,
	clampWidthCm,
	createWriteZone,
	createZoneOnLine,
	findNextFreeLineIndex,
	findNextZonePlacement,
	getMaxLinesForZone,
	getMaxOccupiedLineIndex,
	isLineOccupiedByZone,
	getOccupiedLineIndices,
	getZoneTopCm,
	isZoneEmpty,
	measureEditorLineCount,
	moveZoneByArrow,
	moveZoneWithGrab,
	resizeZone,
	snapYCmToLineIndex
} from './index.js';

describe('write-zone', () => {
	const layout = buildBristolLayout();

	it('snaps y position to nearest line', () => {
		expect(snapYCmToLineIndex(1.52, layout)).toBe(1);
		expect(snapYCmToLineIndex(2.1, layout)).toBe(2);
	});

	it('computes zone top from line index', () => {
		expect(getZoneTopCm(1, layout)).toBe(1.5);
		expect(getZoneTopCm(2, layout)).toBe(2);
	});

	it('clamps geometry inside the sheet', () => {
		expect(clampLeftCm(13, 2, 14.8)).toBe(12.8);
		expect(clampWidthCm(0, 20, 14.8)).toBe(14.8);
		expect(clampLineCount(40, 1, layout)).toBe(getMaxLinesForZone(1, layout));
	});

	it('resizes east and south handles', () => {
		const zone = createWriteZone({ lineIndex: 3, leftCm: 2, widthCm: 4, lineCount: 2 });

		const resized = resizeZone(zone, 'se', { xCm: 1, yCm: 0.5 }, layout, 14.8);
		expect(resized.widthCm).toBe(5);
		expect(resized.lineCount).toBe(3);
	});

	it('moves zone relative to grab offset', () => {
		const zone = createWriteZone({ lineIndex: 3, leftCm: 2, widthCm: 4, lineCount: 2 });
		const moved = moveZoneWithGrab(zone, { xCm: 5, yCm: 3 }, { xCm: 0.5, yCm: 0.2 }, layout, 14.8);

		expect(moved.leftCm).toBe(4.5);
		expect(moved.lineIndex).toBeGreaterThan(0);
	});

	it('detects empty zones', () => {
		expect(isZoneEmpty('')).toBe(true);
		expect(isZoneEmpty('<br>')).toBe(true);
		expect(isZoneEmpty('hello')).toBe(false);
	});

	it('finds the next free line for zone creation', () => {
		const zones = [
			createWriteZone({ lineIndex: 1, leftCm: 0, widthCm: 14.8, lineCount: 1 }),
			createWriteZone({ lineIndex: 3, leftCm: 0, lineCount: 2 })
		];

		expect(getOccupiedLineIndices(zones).has(1)).toBe(true);
		expect(getOccupiedLineIndices(zones).has(4)).toBe(true);
		expect(findNextFreeLineIndex(zones, layout, 1)).toBe(5);
		expect(findNextFreeLineIndex(zones, layout, 2)).toBe(5);
		expect(findNextFreeLineIndex(zones, layout, 5)).toBe(5);
		expect(findNextZonePlacement(zones, layout)?.lineIndex).toBe(5);
	});

	it('places the next zone after the last occupied line, skipping middle gaps', () => {
		const zones = [
			createWriteZone({ lineIndex: 1, leftCm: 0, lineCount: 1 }),
			createWriteZone({ lineIndex: 2, leftCm: 5, widthCm: 5, lineCount: 1 }),
			createWriteZone({ lineIndex: 5, leftCm: 5, widthCm: 5, lineCount: 1 })
		];

		expect(getMaxOccupiedLineIndex(zones)).toBe(5);
		expect(findNextZonePlacement(zones, layout)).toEqual({ lineIndex: 6, leftCm: 0 });
	});

	it('places the next zone on the line after a single right-aligned zone', () => {
		const zones = [createWriteZone({ lineIndex: 1, leftCm: 5, widthCm: 5, lineCount: 1 })];

		expect(isLineOccupiedByZone(zones, 1)).toBe(true);
		expect(findNextZonePlacement(zones, layout)).toEqual({ lineIndex: 2, leftCm: 0 });
	});

	it('places after the lowest block when earlier lines have left-aligned zones', () => {
		const zones = [
			createWriteZone({ lineIndex: 1, leftCm: 0, lineCount: 1 }),
			createWriteZone({ lineIndex: 3, leftCm: 0, lineCount: 1 })
		];

		expect(findNextZonePlacement(zones, layout)).toEqual({ lineIndex: 4, leftCm: 0 });
	});

	it('moves a selected zone with arrow directions', () => {
		const zone = createWriteZone({ lineIndex: 3, leftCm: 2, widthCm: 4, lineCount: 2 });

		expect(moveZoneByArrow(zone, 'left', layout, 14.8).leftCm).toBe(1.5);
		expect(moveZoneByArrow(zone, 'up', layout, 14.8).lineIndex).toBe(2);
	});

	it('creates a zone snapped to a line', () => {
		const zone = createZoneOnLine(4, 14.8);
		expect(zone.lineIndex).toBe(4);
		expect(zone.widthCm).toBe(5);
	});

	it('grows one line per explicit newline even when scrollHeight over-counts', () => {
		const editor = {
			innerText: 'hello\n',
			clientHeight: 20,
			scrollHeight: 58
		} as unknown as HTMLElement;

		expect(measureEditorLineCount(editor, 1)).toBe(2);
	});

	it('uses scroll height for wrapped text without newlines', () => {
		const editor = {
			innerText: 'a very long line that wraps visually',
			clientHeight: 20,
			scrollHeight: 58
		} as unknown as HTMLElement;

		expect(measureEditorLineCount(editor, 1)).toBe(3);
	});
});
