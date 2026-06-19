import { describe, expect, it } from 'vitest';
import { sanitizeEditorHtml } from '$lib/editor/sanitize.js';
import { createEmptySheet } from '$lib/zone/index.js';
import { resolveSheetKeyAction } from '$lib/state/sheet-keyboard-actions.js';
import { getPillMode, selectSingleZone } from '$lib/state/sheet-selection.js';

describe('BristolSheet integration contracts', () => {
	it('sheet data includes stable id, zones and blocks', () => {
		const sheet = createEmptySheet();
		expect(sheet.id).toMatch(/^[a-f0-9-]{36}$|sheet-/);
		expect(sheet.zones).toEqual([]);
		expect(sheet.blocks).toEqual([]);
	});

	it('sanitizes zone html used for print rendering', () => {
		expect(sanitizeEditorHtml('<b>ok</b><script>x</script>')).toBe('<b>ok</b>');
	});

	it('routes keyboard shortcuts through the shared action resolver used by BristolSheet', () => {
		const sheet = createEmptySheet();
		const zone = { id: 'zone-a', lineIndex: 1, leftCm: 1, widthCm: 5, lineCount: 1, content: '' };
		const action = resolveSheetKeyAction(
			{ key: 'c', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
			{
				editable: true,
				isActiveSheet: true,
				sheet: { ...sheet, zones: [zone] },
				selection: selectSingleZone(zone.id),
				isEventInZoneEditor: false
			}
		);
		expect(action).toEqual({ type: 'copy' });
	});

	it('derives pill mode from shared selection helpers used by BristolSheet', () => {
		expect(
			getPillMode({
				selectedZoneIds: ['a', 'b'],
				selectedBlockId: null,
				editingZoneId: null
			})
		).toBe('multi');
	});
});
