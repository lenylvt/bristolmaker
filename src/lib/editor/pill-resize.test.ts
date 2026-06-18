import { describe, expect, it } from 'vitest';

describe('pill-resize', () => {
	it('exports animateCardResize', async () => {
		const { animateCardResize } = await import('./pill-resize.js');
		expect(typeof animateCardResize).toBe('function');
	});
});
