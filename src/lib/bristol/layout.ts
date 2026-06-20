/** Dimensions Oxford Bristol 148×210 mm (A5), layout in centimeters. */
export const BRISTOL_SPECS = {
	widthMm: 148,
	heightMm: 210,
	widthCm: 14.8,
	heightCm: 21,
	headerCm: 1.5,
	firstLineCm: 2,
	lineSpacingCm: 0.5,
	cornerMarkCm: 1.2
} as const;

/** Décalage vertical du texte (écran + impression). */
export const TEXT_OFFSET = '0.08cm';

export type BristolLine = {
	index: number;
	positionCm: number;
};

export type BristolLayout = {
	specs: typeof BRISTOL_SPECS;
	headerLineCm: number;
	lines: BristolLine[];
	cornerMarks: {
		bottomLeft: { x: number; y: number; size: number };
		bottomRight: { x: number; y: number; size: number };
	};
};

export function buildBristolLayout(): BristolLayout {
	const { heightCm, lineSpacingCm, cornerMarkCm, widthCm, headerCm, firstLineCm } = BRISTOL_SPECS;

	const maxLineCm = heightCm - cornerMarkCm;
	const positions: number[] = [];

	for (let positionCm = firstLineCm; positionCm <= maxLineCm + 1e-9; positionCm += lineSpacingCm) {
		positions.push(round(positionCm));
	}

	const lines: BristolLine[] = positions.map((positionCm, index) => ({
		index: index + 1,
		positionCm
	}));

	return {
		specs: BRISTOL_SPECS,
		headerLineCm: headerCm,
		lines,
		cornerMarks: {
			bottomLeft: { x: 0, y: round(heightCm - cornerMarkCm), size: cornerMarkCm },
			bottomRight: {
				x: round(widthCm - cornerMarkCm),
				y: round(heightCm - cornerMarkCm),
				size: cornerMarkCm
			}
		}
	};
}

function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}

export function getWritableLines(layout: BristolLayout): BristolLine[] {
	if ('pageCount' in layout && 'totalHeightCm' in layout) {
		return layout.lines;
	}

	return layout.lines.filter((line) => line.positionCm >= layout.specs.firstLineCm - 1e-9);
}

export function getWritableLineCount(layout: BristolLayout): number {
	return getWritableLines(layout).length;
}

/** Zone d'écriture unique couvrant toutes les lignes sous le header. */
export function getWritableArea(layout: BristolLayout): {
	topCm: number;
	heightCm: number;
	lineHeightCm: number;
	paddingTopCm: number;
	horizontalPaddingCm: number;
} {
	const { lineSpacingCm } = layout.specs;

	if ('pageCount' in layout && 'totalHeightCm' in layout) {
		return {
			topCm: 0,
			heightCm: (layout as { totalHeightCm: number }).totalHeightCm,
			lineHeightCm: lineSpacingCm,
			paddingTopCm: 0,
			horizontalPaddingCm: 0.3
		};
	}

	const { headerLineCm } = layout;
	const writableLines = getWritableLines(layout);
	const firstWritableLine = writableLines[0];
	const lastWritableLine = writableLines.at(-1);

	if (!firstWritableLine || !lastWritableLine) {
		return {
			topCm: headerLineCm,
			heightCm: 0,
			lineHeightCm: lineSpacingCm,
			paddingTopCm: lineSpacingCm,
			horizontalPaddingCm: 0.3
		};
	}

	return {
		topCm: headerLineCm,
		heightCm: round(getWritableLines(layout).length * lineSpacingCm),
		lineHeightCm: lineSpacingCm,
		paddingTopCm: 0,
		horizontalPaddingCm: 0.3
	};
}

/** Writable zone directly above each ruled line. */
export function getLineInputZone(
	line: BristolLine,
	layout: BristolLayout
): { topCm: number; heightCm: number } {
	const { lineSpacingCm } = layout.specs;

	return {
		topCm: round(line.positionCm - lineSpacingCm),
		heightCm: lineSpacingCm
	};
}
