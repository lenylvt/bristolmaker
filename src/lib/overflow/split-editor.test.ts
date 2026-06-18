import { describe, expect, it } from 'vitest';
import { splitOverflowText } from '$lib/overflow/index.js';

describe('write-zone-overflow', () => {
	it('splits overflow lines', () => {
		expect(splitOverflowText('a\nb\nc', 2)).toEqual({ current: 'a\nb', overflow: 'c' });
	});
});
