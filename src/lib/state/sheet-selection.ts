import { getBlockForZone, getBlockZoneIds } from '$lib/block/block.js';
import type { SheetData, WriteZone } from '$lib/zone/types.js';

export type SheetSelection = {
	selectedZoneIds: string[];
	selectedBlockId: string | null;
	editingZoneId: string | null;
};

export type PillMode = 'multi' | 'block';

export function createEmptySelection(): SheetSelection {
	return { selectedZoneIds: [], selectedBlockId: null, editingZoneId: null };
}

export function getHighlightedZoneIds(sheet: SheetData, selection: SheetSelection): string[] {
	if (selection.selectedBlockId) {
		return getBlockZoneIds(sheet, selection.selectedBlockId);
	}
	if (selection.selectedZoneIds.length >= 2) {
		return selection.selectedZoneIds;
	}
	return [];
}

export function getPillMode(selection: SheetSelection): PillMode | null {
	if (selection.selectedBlockId) return 'block';
	if (selection.selectedZoneIds.length >= 2) return 'multi';
	return null;
}

export function shouldShowPillAnchor(sheet: SheetData, selection: SheetSelection): boolean {
	return getPillMode(selection) !== null && getHighlightedZoneIds(sheet, selection).length > 0;
}

export function isZoneSelected(
	sheet: SheetData,
	selection: SheetSelection,
	zoneId: string
): boolean {
	if (selection.selectedZoneIds.includes(zoneId)) return true;
	if (!selection.selectedBlockId) return false;
	return getBlockZoneIds(sheet, selection.selectedBlockId).includes(zoneId);
}

export function isZoneBlockSelected(
	sheet: SheetData,
	selection: SheetSelection,
	zoneId: string
): boolean {
	if (!selection.selectedBlockId) return false;
	return getBlockZoneIds(sheet, selection.selectedBlockId).includes(zoneId);
}

export function getPrimarySelectedZoneId(
	sheet: SheetData,
	selection: SheetSelection
): string | null {
	if (selection.selectedZoneIds.length > 0) return selection.selectedZoneIds[0];
	if (selection.selectedBlockId) {
		return getBlockZoneIds(sheet, selection.selectedBlockId)[0] ?? null;
	}
	return null;
}

export function hasSelectionForClipboard(selection: SheetSelection): boolean {
	return selection.selectedBlockId !== null || selection.selectedZoneIds.length > 0;
}

export function isEditingZone(selection: SheetSelection, zoneId: string): boolean {
	return selection.editingZoneId === zoneId;
}

export function getSelectedZones(sheet: SheetData, selection: SheetSelection): WriteZone[] {
	if (selection.selectedBlockId) {
		const ids = new Set(getBlockZoneIds(sheet, selection.selectedBlockId));
		return sheet.zones.filter((zone) => ids.has(zone.id));
	}
	const ids = new Set(selection.selectedZoneIds);
	return sheet.zones.filter((zone) => ids.has(zone.id));
}

export function getMoveGroupZoneIds(
	sheet: SheetData,
	selection: SheetSelection,
	zoneId: string
): string[] {
	if (selection.selectedBlockId) {
		const blockIds = getBlockZoneIds(sheet, selection.selectedBlockId);
		if (blockIds.includes(zoneId)) return blockIds;
	}
	if (selection.selectedZoneIds.length > 1 && selection.selectedZoneIds.includes(zoneId)) {
		return selection.selectedZoneIds;
	}
	return [zoneId];
}

export function getRemovedZoneIds(sheet: SheetData, selection: SheetSelection): string[] {
	const primaryId = getPrimarySelectedZoneId(sheet, selection);
	if (!primaryId) return [];

	if (selection.selectedBlockId) {
		return getBlockZoneIds(sheet, selection.selectedBlockId);
	}
	if (selection.selectedZoneIds.length > 0) {
		return [...selection.selectedZoneIds];
	}
	return [primaryId];
}

export function selectZone(
	sheet: SheetData,
	selection: SheetSelection,
	zoneId: string,
	shiftKey: boolean
): SheetSelection {
	const next: SheetSelection = { ...selection, editingZoneId: null };

	if (shiftKey) {
		const block = getBlockForZone(sheet, zoneId);
		if (block) {
			return { ...next, selectedBlockId: block.id, selectedZoneIds: [] };
		}

		const selectedZoneIds = next.selectedZoneIds.includes(zoneId)
			? next.selectedZoneIds.filter((id) => id !== zoneId)
			: [...next.selectedZoneIds, zoneId];
		return { ...next, selectedBlockId: null, selectedZoneIds };
	}

	const block = getBlockForZone(sheet, zoneId);
	if (block) {
		return { ...next, selectedBlockId: block.id, selectedZoneIds: [] };
	}

	return { ...next, selectedBlockId: null, selectedZoneIds: [zoneId] };
}

export function selectSingleZone(zoneId: string, editing = false): SheetSelection {
	return {
		selectedZoneIds: [zoneId],
		selectedBlockId: null,
		editingZoneId: editing ? zoneId : null
	};
}

export function clearSelection(selection: SheetSelection): SheetSelection {
	return { ...selection, selectedZoneIds: [], selectedBlockId: null };
}

export function enterZoneEdit(zoneId: string): SheetSelection {
	return selectSingleZone(zoneId, true);
}

export function applyPasteSelection(
	result: { zoneIds: string[]; blockId: string | null }
): SheetSelection {
	if (result.blockId) {
		return { selectedZoneIds: [], selectedBlockId: result.blockId, editingZoneId: null };
	}
	return { selectedZoneIds: result.zoneIds, selectedBlockId: null, editingZoneId: null };
}

export function applyCreateBlockSelection(blockId: string | null): SheetSelection {
	return { selectedZoneIds: [], selectedBlockId: blockId, editingZoneId: null };
}

export function applyDuplicateBlockSelection(newBlockId: string): SheetSelection {
	return { selectedZoneIds: [], selectedBlockId: newBlockId, editingZoneId: null };
}

export function blurZoneEdit(selection: SheetSelection, zoneId: string): SheetSelection {
	if (selection.editingZoneId !== zoneId) return selection;
	return { ...selection, editingZoneId: null };
}

export function removeZoneFromSelection(selection: SheetSelection, zoneId: string): SheetSelection {
	return {
		...selection,
		selectedZoneIds: selection.selectedZoneIds.filter((id) => id !== zoneId)
	};
}
