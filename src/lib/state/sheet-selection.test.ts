import { describe, expect, it } from 'vitest';
import { createBlockFromZoneIds } from '$lib/block/block.js';
import { createEmptySheet, createWriteZone } from '$lib/zone/index.js';
import {
	applyCreateBlockSelection,
	applyPasteSelection,
	clearSelection,
	createEmptySelection,
	enterZoneEdit,
	getHighlightedZoneIds,
	getMoveGroupZoneIds,
	getPillMode,
	getPrimarySelectedZoneId,
	getRemovedZoneIds,
	getSelectedZones,
	hasSelectionForClipboard,
	isZoneBlockSelected,
	isZoneSelected,
	selectSingleZone,
	selectZone
} from './sheet-selection.js';

function sheetWithTwoZones() {
	const sheet = createEmptySheet();
	const a = createWriteZone({ lineIndex: 1, leftCm: 1, id: 'zone-a' });
	const b = createWriteZone({ lineIndex: 2, leftCm: 2, id: 'zone-b' });
	return { sheet: { ...sheet, zones: [a, b] }, a, b };
}

describe('sheet-selection', () => {
	it('selects a single zone on click', () => {
		const { sheet, a } = sheetWithTwoZones();
		const next = selectZone(sheet, createEmptySelection(), a.id, false);
		expect(next.selectedZoneIds).toEqual([a.id]);
		expect(next.selectedBlockId).toBeNull();
	});

	it('multi-selects with shift+click', () => {
		const { sheet, a, b } = sheetWithTwoZones();
		let selection = selectZone(sheet, createEmptySelection(), a.id, false);
		selection = selectZone(sheet, selection, b.id, true);
		expect(selection.selectedZoneIds).toEqual([a.id, b.id]);
		expect(getPillMode(selection)).toBe('multi');
	});

	it('selects a block when clicking a grouped zone', () => {
		const { sheet, a, b } = sheetWithTwoZones();
		const blocked = createBlockFromZoneIds(sheet, [a.id, b.id]);
		const selection = selectZone(blocked.sheet, createEmptySelection(), a.id, false);
		expect(selection.selectedBlockId).toBe(blocked.blockId);
		expect(getPillMode(selection)).toBe('block');
	});

	it('returns highlighted zone ids for pill and delete', () => {
		const { sheet, a, b } = sheetWithTwoZones();
		const selection = { selectedZoneIds: [a.id, b.id], selectedBlockId: null, editingZoneId: null };
		expect(getHighlightedZoneIds(sheet, selection)).toEqual([a.id, b.id]);
		expect(getRemovedZoneIds(sheet, selection)).toEqual([a.id, b.id]);
	});

	it('moves grouped zones together', () => {
		const { sheet, a, b } = sheetWithTwoZones();
		const selection = { selectedZoneIds: [a.id, b.id], selectedBlockId: null, editingZoneId: null };
		expect(getMoveGroupZoneIds(sheet, selection, a.id)).toEqual([a.id, b.id]);
	});

	it('enters zone edit from block selection', () => {
		const edit = enterZoneEdit('zone-a');
		expect(edit.editingZoneId).toBe('zone-a');
		expect(edit.selectedBlockId).toBeNull();
	});

	it('tracks clipboard and paste selection', () => {
		const { sheet, a, b } = sheetWithTwoZones();
		const selection = selectSingleZone(a.id);
		expect(hasSelectionForClipboard(selection)).toBe(true);
		expect(getSelectedZones(sheet, selection)).toHaveLength(1);

		const pasted = applyPasteSelection({ zoneIds: [b.id], blockId: null });
		expect(pasted.selectedZoneIds).toEqual([b.id]);

		const blocked = applyCreateBlockSelection('block-x');
		expect(blocked.selectedBlockId).toBe('block-x');
	});

	it('detects block-selected zones without editing chrome', () => {
		const { sheet, a, b } = sheetWithTwoZones();
		const blocked = createBlockFromZoneIds(sheet, [a.id, b.id]);
		const selection = {
			selectedZoneIds: [],
			selectedBlockId: blocked.blockId,
			editingZoneId: null
		};
		expect(isZoneSelected(blocked.sheet, selection, a.id)).toBe(true);
		expect(isZoneBlockSelected(blocked.sheet, selection, a.id)).toBe(true);
		expect(getPrimarySelectedZoneId(blocked.sheet, selection)).toBe(a.id);
	});

	it('clears selection', () => {
		const cleared = clearSelection(selectSingleZone('zone-a'));
		expect(cleared.selectedZoneIds).toEqual([]);
		expect(cleared.selectedBlockId).toBeNull();
	});
});
