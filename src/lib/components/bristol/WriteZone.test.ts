import { describe, expect, it } from 'vitest';
import { getZoneTopCm, getZoneHeightCm } from '$lib/zone/index.js';
import { buildBristolLayout } from '$lib/bristol/layout.js';
import {
	shouldEnterEditOnDoubleClick,
	shouldPreventEditorPointerDefault
} from './WriteZone.interaction.js';

describe('WriteZone layout', () => {
	const layout = buildBristolLayout();

	it('positions zone from line index', () => {
		expect(getZoneTopCm(1, layout)).toBe(1.5);
		expect(getZoneHeightCm(2, layout)).toBe(1);
	});
});

describe('WriteZone interaction helpers', () => {
	it('enters edit mode on double-click only when not already editing', () => {
		expect(shouldEnterEditOnDoubleClick(false)).toBe(true);
		expect(shouldEnterEditOnDoubleClick(true)).toBe(false);
	});

	it('blocks caret placement on first click of an unselected zone', () => {
		expect(shouldPreventEditorPointerDefault(false, 1)).toBe(true);
	});

	it('allows native word selection on the second click of a double-click', () => {
		expect(shouldPreventEditorPointerDefault(false, 2)).toBe(false);
	});

	it('does not block pointer events on an already selected zone', () => {
		expect(shouldPreventEditorPointerDefault(true, 1)).toBe(false);
	});
});
