import { getMaxOccupiedLineIndex } from '$lib/zone/placement.js';
import type { WriteZone } from '$lib/zone/types.js';
import {
	BRISTOL_SPECS,
	buildBristolLayout,
	getWritableLineCount,
	type BristolLayout,
	type BristolLine
} from './layout.js';

/** Seuil de remplissage (75 %) avant d'ajouter une page virtuelle. */
export const GROW_PAGE_THRESHOLD = 0.75;

/** Marge latérale supplémentaire à l'impression uniquement (cm). */
export const PRINT_EXTRA_SIDE_MARGIN_CM = 0.3;

/** Lignes Bristol classiques par page (impression). */
export const PRINT_LINES_PER_PAGE = getWritableLineCount(buildBristolLayout());

/** Lignes pleine page dans l'éditeur continu (sans bandeau ni coins). */
export const CONTINUOUS_LINES_PER_PAGE = Math.floor(
	BRISTOL_SPECS.heightCm / BRISTOL_SPECS.lineSpacingCm
);

export type ContinuousLayout = BristolLayout & {
	pageCount: number;
	linesPerPage: number;
	totalHeightCm: number;
};

function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}

export function getLinesPerPage(): number {
	return CONTINUOUS_LINES_PER_PAGE;
}

/** Nombre de pages virtuelles nécessaires pour le contenu actuel. */
export function computeContinuousPageCount(zones: WriteZone[]): number {
	const linesPerPage = getLinesPerPage();
	const maxLine = getMaxOccupiedLineIndex(zones);

	if (maxLine === 0) return 1;

	const contentPages = Math.max(1, Math.ceil(maxLine / linesPerPage));
	const linesOnLastPage = maxLine - (contentPages - 1) * linesPerPage;
	const growThreshold = Math.ceil(linesPerPage * GROW_PAGE_THRESHOLD);

	if (linesOnLastPage >= growThreshold) {
		return contentPages + 1;
	}

	return contentPages;
}

/** Étend les lignes sur toute la hauteur de chaque page virtuelle. */
export function buildContinuousLayout(pageCount: number): ContinuousLayout {
	const base = buildBristolLayout();
	const linesPerPage = getLinesPerPage();
	const safePageCount = Math.max(1, pageCount);
	const totalLines = safePageCount * linesPerPage;
	const { heightCm, lineSpacingCm } = base.specs;

	const lines: BristolLine[] = [];

	for (let globalIndex = 0; globalIndex < totalLines; globalIndex++) {
		const pageIndex = Math.floor(globalIndex / linesPerPage);
		const lineInPage = globalIndex % linesPerPage;

		lines.push({
			index: globalIndex + 1,
			positionCm: round(pageIndex * heightCm + (lineInPage + 1) * lineSpacingCm)
		});
	}

	return {
		...base,
		headerLineCm: 0,
		lines,
		pageCount: safePageCount,
		linesPerPage,
		totalHeightCm: round(safePageCount * heightCm)
	};
}

/** Positions verticales des séparateurs entre pages (cm). */
export function getPageBreakPositions(pageCount: number, pageHeightCm: number): number[] {
	const positions: number[] = [];
	for (let page = 1; page < pageCount; page++) {
		positions.push(round(page * pageHeightCm));
	}
	return positions;
}

/** Recale les index de lignes d'un ancien format (36 lignes/page) vers le plein format. */
export function migrateContinuousLineIndex(
	lineIndex: number,
	fromLinesPerPage = PRINT_LINES_PER_PAGE,
	toLinesPerPage = CONTINUOUS_LINES_PER_PAGE
): number {
	if (lineIndex <= 0 || fromLinesPerPage === toLinesPerPage) return lineIndex;

	const page = Math.floor((lineIndex - 1) / fromLinesPerPage);
	const lineInPage = ((lineIndex - 1) % fromLinesPerPage) + 1;
	const scaledLine = Math.max(
		1,
		Math.round(1 + ((lineInPage - 1) * (toLinesPerPage - 1)) / (fromLinesPerPage - 1))
	);

	return page * toLinesPerPage + scaledLine;
}

export function migrateZonesToCompactLayout(zones: WriteZone[]): WriteZone[] {
	return zones.map((zone) => ({
		...zone,
		lineIndex: migrateContinuousLineIndex(zone.lineIndex)
	}));
}

/** Fusionne plusieurs feuilles en une seule feuille continue (migration). */
export function mergeSheetsToContinuous<T extends { zones: WriteZone[]; blocks: unknown[] }>(
	sheets: T[]
): T {
	if (sheets.length === 0) {
		throw new Error('mergeSheetsToContinuous requires at least one sheet');
	}

	if (sheets.length === 1) return sheets[0];

	const linesPerPage = getLinesPerPage();
	const merged = { ...sheets[0], zones: [] as WriteZone[], blocks: sheets[0].blocks };

	for (const [sheetIndex, sheet] of sheets.entries()) {
		const lineOffset = sheetIndex * PRINT_LINES_PER_PAGE;
		for (const zone of sheet.zones) {
			merged.zones.push({
				...zone,
				lineIndex: migrateContinuousLineIndex(zone.lineIndex + lineOffset)
			});
		}
	}

	return merged;
}
