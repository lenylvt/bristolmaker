import { describe, expect, it } from 'vitest';
import { createBlockFromZoneIds } from '$lib/block/block.js';
import { createEmptySheet, createWriteZone } from '$lib/zone/index.js';
import { resolveSheetKeyAction } from './sheet-keyboard-actions.js';
import { createEmptySelection, selectSingleZone } from './sheet-selection.js';

function baseContext() {
	const sheet = createEmptySheet();
	const zone = createWriteZone({ lineIndex: 1, leftCm: 1, id: 'zone-a' });
	return {
		editable: true,
		isActiveSheet: true,
		sheet: { ...sheet, zones: [zone] },
		selection: selectSingleZone(zone.id),
		isEventInZoneEditor: false
	};
}

describe('sheet-keyboard-actions', () => {
	it('copies when ctrl+c and zone selected outside editor', () => {
		const action = resolveSheetKeyAction(
			{ key: 'c', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
			baseContext()
		);
		expect(action).toEqual({ type: 'copy' });
	});

	it('pastes when ctrl+v and zone selected outside editor', () => {
		const action = resolveSheetKeyAction(
			{ key: 'v', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
			baseContext()
		);
		expect(action).toEqual({ type: 'paste' });
	});

	it('does not copy while editing', () => {
		const context = baseContext();
		context.selection = { ...context.selection, editingZoneId: 'zone-a' };
		const action = resolveSheetKeyAction(
			{ key: 'c', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
			context
		);
		expect(action).toEqual({ type: 'none' });
	});

	it('deletes the whole block selection', () => {
		const sheet = createEmptySheet();
		const a = createWriteZone({ lineIndex: 1, leftCm: 1, id: 'zone-a' });
		const b = createWriteZone({ lineIndex: 2, leftCm: 2, id: 'zone-b' });
		const blocked = createBlockFromZoneIds({ ...sheet, zones: [a, b] }, [a.id, b.id]);
		const action = resolveSheetKeyAction(
			{ key: 'Delete', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false },
			{
				editable: true,
				isActiveSheet: true,
				sheet: blocked.sheet,
				selection: {
					selectedZoneIds: [],
					selectedBlockId: blocked.blockId,
					editingZoneId: null
				},
				isEventInZoneEditor: false
			}
		);
		expect(action).toEqual({ type: 'delete', zoneIds: [a.id, b.id] });
	});

	it('creates a zone on enter when nothing is selected', () => {
		const action = resolveSheetKeyAction(
			{ key: 'Enter', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false },
			{
				...baseContext(),
				selection: createEmptySelection()
			}
		);
		expect(action).toEqual({ type: 'create-zone' });
	});

	it('moves selection with arrow keys', () => {
		const action = resolveSheetKeyAction(
			{ key: 'ArrowLeft', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false },
			baseContext()
		);
		expect(action).toEqual({ type: 'move', direction: 'left' });
	});
});
