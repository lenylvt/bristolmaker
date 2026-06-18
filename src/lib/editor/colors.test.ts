import { describe, expect, it } from 'vitest';
import { HIGHLIGHT_COLOR_VARS, TEXT_COLOR_VARS } from './colors.js';
import { escapeHtml, plainLinesToHtml } from './html.js';
import { getShortcutCommand } from './shortcuts.js';

describe('editor colors', () => {
	it('exposes text colors with black and white first', () => {
		expect(TEXT_COLOR_VARS[0]).toBe('--color-black');
		expect(TEXT_COLOR_VARS[1]).toBe('--color-white');
		expect(HIGHLIGHT_COLOR_VARS).toHaveLength(8);
	});
});

describe('editor html', () => {
	it('escapes html', () => {
		expect(escapeHtml('<b>&')).toBe('&lt;b&gt;&amp;');
	});

	it('converts plain lines to html', () => {
		expect(plainLinesToHtml('a\nb')).toBe('a<br>b');
	});
});

describe('editor shortcuts', () => {
	it('maps format shortcuts', () => {
		const event = { key: 'b', ctrlKey: true, metaKey: false, altKey: false } as KeyboardEvent;
		expect(getShortcutCommand(event)).toBe('bold');
	});
});
