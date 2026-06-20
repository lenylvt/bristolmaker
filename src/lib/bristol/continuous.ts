import { getMaxOccupiedLineIndex } from '$lib/zone/placement.js';
import type { WriteZone } from '$lib/zone/types.js';
import {
	buildBristolLayout,
	getWritableLineCount,
	type BristolLayout,
	type BristolLine
} from './layout.js';

/** Seuil de remplissage (75 %) avant d'ajouter une page virtuelle. */
export const GROW_PAGE_THRESHOLD = 0.75;

/** Marge latérale supplémentaire à l'impression uniquement (cm). */
export const PRINT_EXTRA_SIDE_MARGIN_CM = 0.3;

export type ContinuousLayout = BristolLayout & {
	pageCount: number;
	linesPerPage: number;
	totalHeightCm: number;
};

function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}

export function getLinesPerPage(layout: BristolLayout = buildBristolLayout()): number {
	return getWritableLineCount(layout);
}

/** Nombre de pages virtuelles nécessaires pour le contenu actuel. */
export function computeContinuousPageCount(
	zones: WriteZone[],
	layout: BristolLayout = buildBristolLayout()
): number {
	const linesPerPage = getLinesPerPage(layout);
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

/** Étend les lignes Bristol sur plusieurs pages pour une feuille continue. */
export function buildContinuousLayout(pageCount: number): ContinuousLayout {
	const base = buildBristolLayout();
	const linesPerPage = getLinesPerPage(base);
	const safePageCount = Math.max(1, pageCount);
	const totalLines = safePageCount * linesPerPage;
	const { heightCm } = base.specs;

	const lines: BristolLine[] = [];

	for (let globalIndex = 0; globalIndex < totalLines; globalIndex++) {
		const pageIndex = Math.floor(globalIndex / linesPerPage);
		const lineInPage = globalIndex % linesPerPage;
		const baseLine = base.lines[lineInPage];
		if (!baseLine) continue;

		lines.push({
			index: globalIndex + 1,
			positionCm: round(pageIndex * heightCm + baseLine.positionCm)
		});
	}

	return {
		...base,
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

/** Fusionne plusieurs feuilles en une seule feuille continue (migration). */
export function mergeSheetsToContinuous<T extends { zones: WriteZone[]; blocks: unknown[] }>(
	sheets: T[],
	layout: BristolLayout = buildBristolLayout()
): T {
	if (sheets.length === 0) {
		throw new Error('mergeSheetsToContinuous requires at least one sheet');
	}

	if (sheets.length === 1) return sheets[0];

	const linesPerPage = getLinesPerPage(layout);
	const merged = { ...sheets[0], zones: [] as WriteZone[], blocks: sheets[0].blocks };

	for (const [sheetIndex, sheet] of sheets.entries()) {
		const lineOffset = sheetIndex * linesPerPage;
		for (const zone of sheet.zones) {
			merged.zones.push({
				...zone,
				lineIndex: zone.lineIndex + lineOffset
			});
		}
	}

	return merged;
}
