import { describe, expect, it } from 'vitest';
import { planZoneInputOverflow } from './resolve-zone-input.js';

function mockEditor({
	innerText = '',
	innerHTML = '',
	clientHeight = 20,
	scrollHeight = 20,
	lineHeight = '20px'
}: {
	innerText?: string;
	innerHTML?: string;
	clientHeight?: number;
	scrollHeight?: number;
	lineHeight?: string;
}): HTMLElement {
	return {
		innerText,
		innerHTML,
		clientHeight,
		scrollHeight,
		style: {},
		ownerDocument: { defaultView: { getComputedStyle: () => ({ lineHeight }) } }
	} as unknown as HTMLElement;
}

describe('planZoneInputOverflow', () => {
	it('returns noop when content fits the current zone', () => {
		const editor = mockEditor({ innerText: 'hello', clientHeight: 40, scrollHeight: 20 });

		expect(planZoneInputOverflow(editor, 2, 10)).toEqual({ type: 'noop' });
	});

	it('expands the zone instead of splitting when pasted text needs more lines', () => {
		const editor = mockEditor({
			innerText: 'line 1\nline 2\nline 3',
			clientHeight: 20,
			scrollHeight: 60,
			lineHeight: '20px'
		});

		expect(planZoneInputOverflow(editor, 1, 10)).toEqual({ type: 'expand', lineCount: 3 });
	});

	it('expands wrapped text that overflows visually', () => {
		const editor = mockEditor({
			innerText: 'a very long line that wraps across multiple visual rows',
			clientHeight: 20,
			scrollHeight: 60,
			lineHeight: '20px'
		});

		expect(planZoneInputOverflow(editor, 1, 10)).toEqual({ type: 'expand', lineCount: 3 });
	});

	it('splits only when the zone is already at max capacity', () => {
		const editor = mockEditor({
			innerText: 'a\nb\nc\nd\ne',
			clientHeight: 40,
			scrollHeight: 40,
			lineHeight: '20px'
		});

		const plan = planZoneInputOverflow(editor, 2, 2);
		expect(plan.type).toBe('split');
		if (plan.type === 'split') {
			expect(plan.lineCount).toBe(2);
			expect(plan.current).toContain('a');
			expect(plan.overflow).toBeTruthy();
		}
	});
});
