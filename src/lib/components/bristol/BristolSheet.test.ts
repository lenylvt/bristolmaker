import { describe, expect, it } from 'vitest';
import { sanitizeEditorHtml } from '$lib/editor/sanitize.js';
import { createEmptySheet } from '$lib/zone/index.js';

describe('BristolSheet data contract', () => {
	it('sheet data includes stable id and zones', () => {
		const sheet = createEmptySheet();
		expect(sheet.id).toMatch(/^[a-f0-9-]{36}$|sheet-/);
		expect(sheet.zones).toEqual([]);
	});

	it('sanitizes zone html used for print rendering', () => {
		expect(sanitizeEditorHtml('<b>ok</b><script>x</script>')).toBe('<b>ok</b>');
	});
});
