import { describe, expect, it } from 'vitest';
import { htmlToPlainLines } from '../html.js';
import {
	nextListStyle,
	nextTextAlign,
	normalizeListStyle,
	parseTextColorVar,
	textColorStyle
} from './index.js';

describe('text-format html helpers', () => {
	it('converts simple html to plain lines', () => {
		expect(htmlToPlainLines('a<br>b')).toBe('a\nb');
	});

	it('parses text color css vars', () => {
		expect(parseTextColorVar('color: var(--color-3)')).toBe('--color-3');
		expect(parseTextColorVar('color: var(--color-black)')).toBe('--color-black');
		expect(parseTextColorVar('color: var(--color-white)')).toBe('--color-white');
	});

	it('normalizes star list to dash', () => {
		expect(normalizeListStyle('star')).toBe('dash');
	});

	it('builds text color style', () => {
		expect(textColorStyle('--color-2')).toBe('color: var(--color-2)');
	});

	it('cycles text alignment', () => {
		expect(nextTextAlign('left')).toBe('center');
		expect(nextTextAlign('center')).toBe('right');
		expect(nextTextAlign('right')).toBe('justify');
		expect(nextTextAlign('justify')).toBe('left');
	});

	it('cycles list styles then turns off', () => {
		expect(nextListStyle(null)).toBe('dash');
		expect(nextListStyle('dash')).toBe('decimal');
		expect(nextListStyle('decimal')).toBe('roman');
		expect(nextListStyle('roman')).toBe(null);
	});

	it('exports selection helpers', async () => {
		const {
			saveEditorSelection,
			restoreEditorSelection,
			bookmarkEditorSelection,
			withPreservedEditorSelection
		} = await import('./index.js');
		expect(typeof saveEditorSelection).toBe('function');
		expect(typeof restoreEditorSelection).toBe('function');
		expect(typeof bookmarkEditorSelection).toBe('function');
		expect(typeof withPreservedEditorSelection).toBe('function');
	});
});
