import { describe, expect, it } from 'vitest';
import {
	clearZoneClipboard,
	copyZonesToClipboard,
	readZonesFromClipboard
} from '$lib/zone/clipboard.js';
import { createWriteZone } from '$lib/zone/index.js';

describe('zone clipboard', () => {
	it('stores and reads zone copies in memory', () => {
		clearZoneClipboard();
		const zone = createWriteZone({ lineIndex: 1, leftCm: 2, content: '<b>hi</b>' });
		copyZonesToClipboard([zone]);

		const pasted = readZonesFromClipboard();
		expect(pasted).toHaveLength(1);
		expect(pasted?.[0].content).toBe('<b>hi</b>');
		expect(pasted?.[0].id).not.toBe(zone.id);
	});

	it('returns null when clipboard is empty', () => {
		clearZoneClipboard();
		expect(readZonesFromClipboard()).toBeNull();
	});
});
