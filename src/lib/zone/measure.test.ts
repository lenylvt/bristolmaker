import { describe, expect, it } from 'vitest';
import { buildBristolLayout } from '$lib/bristol/layout.js';
import { plainLinesToHtml } from '$lib/editor/html.js';
import {
	createWriteZone,
	measureExplicitLineCount,
	measureZoneMinLineCount,
	resizeZone
} from '$lib/zone/index.js';

describe('measureZoneMinLineCount', () => {
	it('returns one line for empty zones', () => {
		const zone = createWriteZone({ lineIndex: 1, leftCm: 0, widthCm: 5, lineCount: 3 });
		expect(measureZoneMinLineCount(zone)).toBe(1);
	});

	it('returns one line for an empty editor even when the zone is tall', () => {
		const zone = createWriteZone({ lineIndex: 1, leftCm: 0, widthCm: 5, lineCount: 8 });
		const editor = {
			innerText: '',
			innerHTML: '<div><br></div>',
			clientHeight: 80,
			scrollHeight: 120
		} as unknown as HTMLElement;

		expect(measureZoneMinLineCount(zone, editor)).toBe(1);
	});

	it('counts explicit newlines in stored content', () => {
		const zone = createWriteZone({
			lineIndex: 1,
			leftCm: 0,
			widthCm: 5,
			lineCount: 1,
			content: plainLinesToHtml('ligne 1\nligne 2\nligne 3\nligne 4\nligne 5')
		});

		expect(measureZoneMinLineCount(zone)).toBe(5);
	});

	it('ignores visual wrapping for the resize minimum', () => {
		const zone = createWriteZone({ lineIndex: 1, leftCm: 0, widthCm: 5, lineCount: 2 });
		const editor = {
			innerText: 'a very long line that wraps visually',
			clientHeight: 20,
			scrollHeight: 58
		} as unknown as HTMLElement;

		expect(measureExplicitLineCount(editor)).toBe(1);
		expect(measureZoneMinLineCount(zone, editor)).toBe(1);
	});
});

describe('resizeZone content minimum', () => {
	const layout = buildBristolLayout();

	it('cannot shrink below the content line minimum on south handle', () => {
		const zone = createWriteZone({ lineIndex: 3, leftCm: 2, widthCm: 4, lineCount: 5 });

		const resized = resizeZone(zone, 's', { xCm: 0, yCm: -2 }, layout, 14.8, 5);
		expect(resized.lineCount).toBe(5);
	});

	it('can shrink empty zones below their current height', () => {
		const zone = createWriteZone({ lineIndex: 3, leftCm: 2, widthCm: 4, lineCount: 5 });

		const resized = resizeZone(zone, 's', { xCm: 0, yCm: -0.5 }, layout, 14.8, 1);
		expect(resized.lineCount).toBe(4);
	});

	it('cannot shrink below the content line minimum on north handle', () => {
		const zone = createWriteZone({ lineIndex: 3, leftCm: 2, widthCm: 4, lineCount: 5 });

		const resized = resizeZone(zone, 'n', { xCm: 0, yCm: 1 }, layout, 14.8, 5);
		expect(resized.lineCount).toBe(5);
		expect(resized.lineIndex).toBe(3);
	});
});
