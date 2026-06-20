import { describe, expect, it } from 'vitest';
import { buildContinuousLayout } from '$lib/bristol/continuous.js';
import { computePrintPageCount, mapSheetForPrint, slicePrintSheetPage } from '$lib/bristol/print-map.js';
import { createWriteZone } from '$lib/zone/factory.js';
import { createEmptySheet } from '$lib/zone/index.js';

describe('print-map', () => {
	it('maps editor line indexes to printable Bristol lines', () => {
		const sheet = createEmptySheet();
		sheet.zones = [createWriteZone({ lineIndex: 1, leftCm: 0, widthCm: 5, lineCount: 2 })];

		const mapped = mapSheetForPrint(sheet, buildContinuousLayout(1));
		expect(mapped.zones[0].lineIndex).toBe(1);
	});

	it('slices mapped zones per print page', () => {
		const sheet = createEmptySheet();
		sheet.zones = [
			createWriteZone({ lineIndex: 1, leftCm: 0, widthCm: 5, lineCount: 2 }),
			createWriteZone({ lineIndex: 43, leftCm: 1, widthCm: 4, lineCount: 2 })
		];

		const mapped = mapSheetForPrint(sheet, buildContinuousLayout(2));
		const page1 = slicePrintSheetPage(mapped, 0);
		const page2 = slicePrintSheetPage(mapped, 1);

		expect(page1.zones).toHaveLength(1);
		expect(page2.zones).toHaveLength(1);
		expect(computePrintPageCount(mapped)).toBe(2);
	});
});
