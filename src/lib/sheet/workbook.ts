import { MAX_SHEETS } from './count.js';
import { createEmptySheet, type SheetData } from '$lib/zone/index.js';

export function resizeSheetContents(contents: SheetData[], count: number): SheetData[] {
	const next = contents.slice(0, count);

	while (next.length < count) {
		next.push(createEmptySheet());
	}

	return next;
}

export function addSheet(contents: SheetData[]): SheetData[] {
	if (contents.length >= MAX_SHEETS) return contents;
	return [...contents, createEmptySheet()];
}

export function removeSheet(contents: SheetData[], index: number): SheetData[] {
	if (index <= 0 || contents.length <= 1) return contents;
	return contents.filter((_, sheetIndex) => sheetIndex !== index);
}
