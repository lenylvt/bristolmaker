import { describe, expect, it } from 'vitest';
import { createWriteZone } from '$lib/zone/factory.js';
import {
	buildContinuousLayout,
	computeContinuousPageCount,
	getPageBreakPositions,
	getLinesPerPage,
	GROW_PAGE_THRESHOLD,
	mergeSheetsToContinuous
} from '$lib/bristol/continuous.js';
import { buildBristolLayout } from '$lib/bristol/layout.js';
import { createEmptySheet } from '$lib/zone/index.js';

describe('continuous layout', () => {
	const baseLayout = buildBristolLayout();
	const linesPerPage = getLinesPerPage(baseLayout);

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

	it('extends ruled lines across virtual pages', () => {
		const layout = buildContinuousLayout(2);
		expect(layout.pageCount).toBe(2);
		expect(layout.totalHeightCm).toBe(42);
		expect(layout.lines).toHaveLength(linesPerPage * 2);
		expect(layout.lines[linesPerPage]?.positionCm).toBe(21 + 2);
	});

	it('returns page break positions between pages', () => {
		expect(getPageBreakPositions(3, 21)).toEqual([21, 42]);
	});

	it('merges multi-sheet workspaces into one continuous sheet', () => {
		const sheet1 = createEmptySheet();
		const sheet2 = createEmptySheet();
		sheet1.zones = [createWriteZone({ lineIndex: 5, leftCm: 0, widthCm: 5 })];
		sheet2.zones = [createWriteZone({ lineIndex: 2, leftCm: 1, widthCm: 4 })];

		const merged = mergeSheetsToContinuous([sheet1, sheet2]);
		expect(merged.zones).toHaveLength(2);
		expect(merged.zones[1].lineIndex).toBe(linesPerPage + 2);
	});
});
