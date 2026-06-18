import { describe, expect, it } from 'vitest';
import { parseSheetCount } from './count.js';

describe('parseSheetCount', () => {
	it('defaults invalid values to current count', () => {
		expect(parseSheetCount('', 2)).toBe(2);
		expect(parseSheetCount('abc', 3)).toBe(3);
		expect(parseSheetCount('0', 1)).toBe(1);
	});

	it('caps at 30 sheets', () => {
		expect(parseSheetCount('50')).toBe(30);
	});

	it('accepts valid counts', () => {
		expect(parseSheetCount('5')).toBe(5);
	});
});
