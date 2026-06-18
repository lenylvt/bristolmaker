import { describe, expect, it } from 'vitest';
import { clampScale, zoomFromWheel } from './pan-zoom.js';

describe('viewport-pan-zoom', () => {
	it('clamps scale', () => {
		expect(clampScale(4)).toBe(3);
		expect(clampScale(0.2)).toBe(0.5);
	});

	it('zooms from wheel delta', () => {
		expect(zoomFromWheel(1, -500)).toBe(3);
		expect(zoomFromWheel(1, -30)).toBeGreaterThan(1.15);
	});
});
