import { describe, expect, it } from 'vitest';
import { computeAnchorFromRects } from './selection-anchor.js';

describe('selection-anchor', () => {
	it('returns null when no rects are provided', () => {
		expect(computeAnchorFromRects([])).toBeNull();
	});

	it('computes the center-top anchor from zone rects', () => {
		expect(
			computeAnchorFromRects([
				{ top: 100, left: 10, right: 50 },
				{ top: 140, left: 70, right: 130 }
			])
		).toEqual({
			top: 100,
			left: 70
		});
	});
});
