import { describe, expect, it } from 'vitest';
import { getZoneTopCm, getZoneHeightCm } from '$lib/zone/index.js';
import { buildBristolLayout } from '$lib/bristol/layout.js';

describe('WriteZone layout', () => {
	const layout = buildBristolLayout();

	it('positions zone from line index', () => {
		expect(getZoneTopCm(1, layout)).toBe(1.5);
		expect(getZoneHeightCm(2, layout)).toBe(1);
	});
});
