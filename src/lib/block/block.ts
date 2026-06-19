import { cloneWriteZone, createEntityId } from '$lib/zone/factory.js';
import type { SheetData, WriteZone, ZoneGeometry } from '$lib/zone/types.js';
import type { ZoneBlock } from './types.js';

const PASTE_OFFSET_CM = 0.5;

export function createBlockId(): string {
	return createEntityId('block');
}

export function getBlockForZone(sheet: SheetData, zoneId: string): ZoneBlock | null {
	return sheet.blocks.find((block) => block.zoneIds.includes(zoneId)) ?? null;
}

export function getBlockZoneIds(sheet: SheetData, blockId: string): string[] {
	return sheet.blocks.find((block) => block.id === blockId)?.zoneIds ?? [];
}

export function getZonesInBlock(sheet: SheetData, blockId: string): WriteZone[] {
	const ids = new Set(getBlockZoneIds(sheet, blockId));
	return sheet.zones.filter((zone) => ids.has(zone.id));
}

export function createBlockFromZoneIds(
	sheet: SheetData,
	zoneIds: string[]
): { sheet: SheetData; blockId: string | null } {
	if (zoneIds.length < 2) return { sheet, blockId: null };

	const unique = [...new Set(zoneIds)];
	const block: ZoneBlock = { id: createBlockId(), zoneIds: unique };

	return {
		sheet: {
			...sheet,
			blocks: [...sheet.blocks, block]
		},
		blockId: block.id
	};
}

export function removeBlock(sheet: SheetData, blockId: string): SheetData {
	return {
		...sheet,
		blocks: sheet.blocks.filter((block) => block.id !== blockId)
	};
}

export function duplicateBlock(
	sheet: SheetData,
	blockId: string
): { sheet: SheetData; newBlockId: string } {
	const sourceZones = getZonesInBlock(sheet, blockId);
	if (sourceZones.length === 0) return { sheet, newBlockId: blockId };

	const { zones: pasted, block } = duplicateZonesWithBlock(sourceZones, PASTE_OFFSET_CM);

	return {
		sheet: {
			...sheet,
			zones: [...sheet.zones, ...pasted],
			blocks: [...sheet.blocks, block]
		},
		newBlockId: block.id
	};
}

export function duplicateZonesWithBlock(
	zones: WriteZone[],
	offsetCm = PASTE_OFFSET_CM
): { zones: WriteZone[]; block: ZoneBlock } {
	const cloned = zones.map((zone) =>
		cloneWriteZone(zone, {
			leftCm: zone.leftCm + offsetCm,
			lineIndex: zone.lineIndex
		})
	);
	const block: ZoneBlock = {
		id: createBlockId(),
		zoneIds: cloned.map((zone) => zone.id)
	};
	return { zones: cloned, block };
}

export function pasteZones(
	sheet: SheetData,
	zones: WriteZone[]
): { sheet: SheetData; zoneIds: string[]; blockId: string | null } {
	if (zones.length === 0) {
		return { sheet, zoneIds: [], blockId: null };
	}

	if (zones.length === 1) {
		const pasted = cloneWriteZone(zones[0], {
			leftCm: zones[0].leftCm + PASTE_OFFSET_CM
		});
		return {
			sheet: { ...sheet, zones: [...sheet.zones, pasted] },
			zoneIds: [pasted.id],
			blockId: null
		};
	}

	const { zones: pasted, block } = duplicateZonesWithBlock(zones, PASTE_OFFSET_CM);

	return {
		sheet: {
			...sheet,
			zones: [...sheet.zones, ...pasted],
			blocks: [...sheet.blocks, block]
		},
		zoneIds: pasted.map((zone) => zone.id),
		blockId: block.id
	};
}

export function moveBlockZones(
	sheet: SheetData,
	blockId: string,
	anchorZoneId: string,
	nextGeometry: ZoneGeometry
): SheetData {
	const block = sheet.blocks.find((item) => item.id === blockId);
	if (!block) return sheet;
	return moveZonesByDelta(sheet, block.zoneIds, anchorZoneId, nextGeometry);
}

export function moveZonesByDelta(
	sheet: SheetData,
	zoneIds: string[],
	anchorZoneId: string,
	nextGeometry: ZoneGeometry
): SheetData {
	const anchor = sheet.zones.find((zone) => zone.id === anchorZoneId);
	if (!anchor) return sheet;

	const delta = {
		lineIndex: nextGeometry.lineIndex - anchor.lineIndex,
		leftCm: nextGeometry.leftCm - anchor.leftCm
	};

	const moving = new Set(zoneIds);

	return {
		...sheet,
		zones: sheet.zones.map((zone) => {
			if (!moving.has(zone.id)) return zone;
			if (zone.id === anchorZoneId) {
				return { ...zone, ...nextGeometry };
			}
			return {
				...zone,
				lineIndex: Math.max(1, zone.lineIndex + delta.lineIndex),
				leftCm: zone.leftCm + delta.leftCm
			};
		})
	};
}

export function removeZonesFromBlocks(sheet: SheetData, removedZoneIds: string[]): SheetData {
	const removed = new Set(removedZoneIds);
	const blocks = sheet.blocks
		.map((block) => ({
			...block,
			zoneIds: block.zoneIds.filter((id) => !removed.has(id))
		}))
		.filter((block) => block.zoneIds.length >= 2);

	return { ...sheet, blocks };
}
