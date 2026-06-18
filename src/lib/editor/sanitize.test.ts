import { describe, expect, it } from 'vitest';
import { sanitizeEditorHtml } from './sanitize.js';

describe('sanitizeEditorHtml', () => {
	it('keeps allowed formatting tags', () => {
		const input = '<b>bold</b> <i>italic</i> <span style="color: var(--color-1)">color</span>';
		expect(sanitizeEditorHtml(input)).toContain('<b>bold</b>');
		expect(sanitizeEditorHtml(input)).toContain('<i>italic</i>');
	});

	it('strips script tags', () => {
		const input = '<script>alert(1)</script><b>ok</b>';
		expect(sanitizeEditorHtml(input)).toBe('<b>ok</b>');
	});

	it('strips event handlers', () => {
		const input = '<img src=x onerror=alert(1) /><b>ok</b>';
		expect(sanitizeEditorHtml(input)).not.toContain('onerror');
	});

	it('keeps highlight markup', () => {
		const input =
			'<mark style="background-color: var(--color-1); color: inherit;">surligné</mark>';
		expect(sanitizeEditorHtml(input)).toContain('<mark');
		expect(sanitizeEditorHtml(input)).toContain('--color-1');
	});
});
