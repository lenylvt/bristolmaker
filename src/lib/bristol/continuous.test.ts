import { describe, expect, it } from 'vitest';
import { createWriteZone } from '$lib/zone/factory.js';
import {
	buildContinuousLayout,
	computeContinuousPageCount,
	CONTINUOUS_LINES_PER_PAGE,
	getPageBreakPositions,
	getLinesPerPage,
	GROW_PAGE_THRESHOLD,
	migrateContinuousLineIndex,
	mergeSheetsToContinuous,
	PRINT_LINES_PER_PAGE
} from '$lib/bristol/continuous.js';
import { createEmptySheet } from '$lib/zone/index.js';

describe('continuous layout', () => {
	const linesPerPage = getLinesPerPage();

	it('uses full page height in the editor', () => {
		expect(linesPerPage).toBe(CONTINUOUS_LINES_PER_PAGE);
		expect(linesPerPage).toBe(42);
	});

	it('starts with one page when empty', () => {
		expect(computeContinuousPageCount([])).toBe(1);
	});

	it('grows to two pages when last page reaches 75%', () => {
		const threshold = Math.ceil(linesPerPage * GROW_PAGE_THRESHOLD);
		const zones = [
			createWriteZone({
				lineIndex: threshold,
				leftCm: 0,
				widthCm: 5,
				lineCount: 1
			})
		];
		expect(computeContinuousPageCount(zones)).toBe(2);
	});

	it('extends ruled lines from the top of each page', () => {
		const layout = buildContinuousLayout(2);
		expect(layout.pageCount).toBe(2);
		expect(layout.totalHeightCm).toBe(42);
		expect(layout.headerLineCm).toBe(0);
		expect(layout.lines).toHaveLength(linesPerPage * 2);
		expect(layout.lines[0]?.positionCm).toBe(0.5);
		expect(layout.lines[linesPerPage]?.positionCm).toBe(21.5);
	});

	it('returns page break positions between pages', () => {
		expect(getPageBreakPositions(3, 21)).toEqual([21, 42]);
	});

	it('migrates legacy 36-line indexes to compact layout', () => {
		expect(migrateContinuousLineIndex(1)).toBe(1);
		expect(migrateContinuousLineIndex(36)).toBe(42);
		expect(migrateContinuousLineIndex(37)).toBe(43);
	});

	it('merges multi-sheet workspaces into one continuous sheet', () => {
		const sheet1 = createEmptySheet();
		const sheet2 = createEmptySheet();
		sheet1.zones = [createWriteZone({ lineIndex: 5, leftCm: 0, widthCm: 5 })];
		sheet2.zones = [createWriteZone({ lineIndex: 2, leftCm: 1, widthCm: 4 })];

		const merged = mergeSheetsToContinuous([sheet1, sheet2]);
		expect(merged.zones).toHaveLength(2);
		expect(merged.zones[1].lineIndex).toBe(migrateContinuousLineIndex(PRINT_LINES_PER_PAGE + 2));
	});
});
