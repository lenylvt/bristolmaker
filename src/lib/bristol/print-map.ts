import { getMaxOccupiedLineIndex } from '$lib/zone/placement.js';
import type { SheetData } from '$lib/zone/types.js';
import {
	CONTINUOUS_LINES_PER_PAGE,
	migrateZonesToCompactLayout,
	PRINT_LINES_PER_PAGE,
	type ContinuousLayout
} from './continuous.js';
import { buildBristolLayout, getWritableLineCount } from './layout.js';

function mapLineIndexToPrint(
	lineIndex: number,
	editorLinesPerPage: number,
	printLinesPerPage: number
): number {
	if (lineIndex <= 0) return lineIndex;

	const page = Math.floor((lineIndex - 1) / editorLinesPerPage);
	const lineInPage = ((lineIndex - 1) % editorLinesPerPage) + 1;
	const printLineInPage = Math.max(
		1,
		Math.min(
			printLinesPerPage,
			Math.round(1 + ((lineInPage - 1) * (printLinesPerPage - 1)) / (editorLinesPerPage - 1))
		)
	);

	return page * printLinesPerPage + printLineInPage;
}

function mapLineCountToPrint(
	lineCount: number,
	editorLinesPerPage: number,
	printLinesPerPage: number
): number {
	return Math.max(
		1,
		Math.round(1 + ((lineCount - 1) * (printLinesPerPage - 1)) / (editorLinesPerPage - 1))
	);
}

/** Adapte les zones de l'éditeur continu au format Bristol imprimable. */
export function mapSheetForPrint(sheet: SheetData, continuousLayout: ContinuousLayout): SheetData {
	const printLinesPerPage = getWritableLineCount(buildBristolLayout());
	const editorLinesPerPage = continuousLayout.linesPerPage;

	return {
		...sheet,
		zones: sheet.zones.map((zone) => ({
			...zone,
			lineIndex: mapLineIndexToPrint(zone.lineIndex, editorLinesPerPage, printLinesPerPage),
			lineCount: mapLineCountToPrint(zone.lineCount, editorLinesPerPage, printLinesPerPage)
		}))
	};
}

export function computePrintPageCount(sheet: SheetData): number {
	const printLinesPerPage = getWritableLineCount(buildBristolLayout());
	const maxLine = getMaxOccupiedLineIndex(sheet.zones);
	return Math.max(1, Math.ceil(maxLine / printLinesPerPage));
}

/** Extrait les zones visibles sur une page Bristol imprimable. */
export function slicePrintSheetPage(sheet: SheetData, pageIndex: number): SheetData {
	const lineOffset = pageIndex * PRINT_LINES_PER_PAGE;
	const pageStart = lineOffset + 1;
	const pageEnd = lineOffset + PRINT_LINES_PER_PAGE;

	const zones = sheet.zones
		.filter((zone) => {
			const zoneEnd = zone.lineIndex + zone.lineCount - 1;
			return zoneEnd >= pageStart && zone.lineIndex <= pageEnd;
		})
		.map((zone) => {
			const zoneEnd = zone.lineIndex + zone.lineCount - 1;
			const localStart = Math.max(zone.lineIndex, pageStart) - lineOffset;
			const localEnd = Math.min(zoneEnd, pageEnd) - lineOffset;

			return {
				...zone,
				lineIndex: localStart,
				lineCount: localEnd - localStart + 1
			};
		});

	return { ...sheet, zones };
}

export { CONTINUOUS_LINES_PER_PAGE, PRINT_LINES_PER_PAGE };
