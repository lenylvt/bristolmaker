import { describe, expect, it } from 'vitest';
import {
	BRISTOL_SPECS,
	buildBristolLayout,
	getLineInputZone,
	getWritableArea,
	getWritableLineCount
} from '$lib/bristol/layout.js';

describe('buildBristolLayout', () => {
	it('uses Oxford Bristol A5 dimensions', () => {
		expect(BRISTOL_SPECS.widthMm).toBe(148);
		expect(BRISTOL_SPECS.heightMm).toBe(210);
	});

	it('places the header at 1.5 cm', () => {
		const layout = buildBristolLayout();
		expect(layout.headerLineCm).toBe(1.5);
	});

	it('starts ruled lines at 2 cm every 0.5 cm', () => {
		const layout = buildBristolLayout();

		expect(layout.lines[0]?.positionCm).toBe(2);
		expect(layout.lines[1]?.positionCm).toBe(2.5);
		expect(layout.lines[2]?.positionCm).toBe(3);
		expect(layout.lines.at(-1)?.positionCm).toBe(19.5);
		expect(layout.lines).toHaveLength(36);
	});

	it('draws 1.2 cm corner marks at the bottom', () => {
		const layout = buildBristolLayout();

		expect(layout.cornerMarks.bottomLeft).toEqual({ x: 0, y: 19.8, size: 1.2 });
		expect(layout.cornerMarks.bottomRight).toEqual({ x: 13.6, y: 19.8, size: 1.2 });
	});
});

describe('getWritableArea', () => {
	it('covers writable lines below the header', () => {
		const layout = buildBristolLayout();
		const area = getWritableArea(layout);

		expect(area.topCm).toBe(1.5);
		expect(area.lineHeightCm).toBe(0.5);
		expect(area.paddingTopCm).toBe(0);
		expect(area.heightCm).toBe(getWritableLineCount(layout) * 0.5);
		expect(area.heightCm).toBe(18);
	});
});

describe('getLineInputZone', () => {
	it('aligns each writable zone on the 0.5 cm grid', () => {
		const layout = buildBristolLayout();
		const first = layout.lines[0]!;
		const second = layout.lines[1]!;

		expect(getLineInputZone(first, layout)).toEqual({ topCm: 1.5, heightCm: 0.5 });
		expect(getLineInputZone(second, layout)).toEqual({ topCm: 2, heightCm: 0.5 });
	});
});
