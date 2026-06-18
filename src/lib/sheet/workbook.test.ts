import { describe, expect, it } from 'vitest';
import { addSheet, removeSheet, resizeSheetContents } from './workbook.js';
import { createEmptySheet } from '$lib/zone/index.js';

describe('sheet workbook', () => {
	it('creates empty sheet data', () => {
		const sheet = createEmptySheet();
		expect(sheet.zones).toEqual([]);
		expect(sheet.id).toBeTruthy();
	});

	it('grows and trims sheet arrays', () => {
		const initial = [createEmptySheet()];
		const resized = resizeSheetContents(initial, 2);

		expect(resized).toHaveLength(2);
		expect(resized[0].zones).toEqual([]);
		expect(resized[1].zones).toEqual([]);
	});

	it('adds a sheet optimistically', () => {
		expect(addSheet([createEmptySheet()])).toHaveLength(2);
	});

	it('removes sheets after the first', () => {
		const sheets = [createEmptySheet(), createEmptySheet(), createEmptySheet()];
		expect(removeSheet(sheets, 1)).toHaveLength(2);
		expect(removeSheet([createEmptySheet()], 0)).toHaveLength(1);
	});
});
