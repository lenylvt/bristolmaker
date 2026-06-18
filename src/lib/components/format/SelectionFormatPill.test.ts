import { describe, expect, it } from 'vitest';
import { TEXT_ALIGN_CYCLE, nextTextAlign } from '$lib/editor/format/index.js';

describe('SelectionFormatPill format helpers', () => {
	it('cycles text alignment', () => {
		expect(nextTextAlign('left')).toBe('center');
		expect(nextTextAlign('justify')).toBe('left');
		expect(TEXT_ALIGN_CYCLE).toHaveLength(4);
	});
});
