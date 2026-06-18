import { describe, expect, it } from 'vitest';
import { splitOverflowText } from './split-text.js';

describe('splitOverflowText', () => {
	it('splits text when lines exceed max', () => {
		const text = 'a\nb\nc\nd';
		expect(splitOverflowText(text, 2)).toEqual({ current: 'a\nb', overflow: 'c\nd' });
	});

	it('returns unchanged text when within limit', () => {
		const text = 'a\nb';
		expect(splitOverflowText(text, 3)).toEqual({ current: 'a\nb', overflow: '' });
	});
});
