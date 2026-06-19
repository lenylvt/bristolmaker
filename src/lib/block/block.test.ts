import { describe, expect, it } from 'vitest';
import {
	createBlockFromZoneIds,
	duplicateBlock,
	getBlockForZone,
	moveBlockZones,
	moveZonesByDelta,
	pasteZones,
	removeBlock,
	removeZonesFromBlocks
} from '$lib/block/block.js';
import { createEmptySheet, createWriteZone } from '$lib/zone/index.js';

function sheetWithZones(count: number) {
	const sheet = createEmptySheet();
	const zones = Array.from({ length: count }, (_, index) =>
		createWriteZone({
			lineIndex: index + 1,
			leftCm: 1 + index,
			content: `zone-${index}`
		})
	);
	return { ...sheet, zones };
}

describe('block helpers', () => {
	it('creates a block from multiple zone ids', () => {
		const sheet = sheetWithZones(2);
		const result = createBlockFromZoneIds(sheet, [sheet.zones[0].id, sheet.zones[1].id]);

		expect(result.blockId).toBeTruthy();
		expect(result.sheet.blocks).toHaveLength(1);
		expect(getBlockForZone(result.sheet, sheet.zones[0].id)?.zoneIds).toHaveLength(2);
	});

	it('moves all zones in a block together', () => {
		let sheet = sheetWithZones(2);
		const created = createBlockFromZoneIds(sheet, [sheet.zones[0].id, sheet.zones[1].id]);
		sheet = created.sheet;
		const blockId = created.blockId!;

		sheet = moveBlockZones(sheet, blockId, sheet.zones[0].id, {
			lineIndex: 3,
			leftCm: 4,
			widthCm: sheet.zones[0].widthCm,
			lineCount: sheet.zones[0].lineCount
		});

		expect(sheet.zones[0].lineIndex).toBe(3);
		expect(sheet.zones[0].leftCm).toBe(4);
		expect(sheet.zones[1].lineIndex).toBe(4);
		expect(sheet.zones[1].leftCm).toBe(5);
	});

	it('clamps line index when moving grouped zones upward', () => {
		const sheet = createEmptySheet();
		const a = createWriteZone({ lineIndex: 1, leftCm: 1, id: 'zone-a' });
		const b = createWriteZone({ lineIndex: 2, leftCm: 2, id: 'zone-b' });
		const withZones = { ...sheet, zones: [a, b] };
		const moved = moveZonesByDelta(withZones, [a.id, b.id], a.id, {
			lineIndex: 0,
			leftCm: 1,
			widthCm: a.widthCm,
			lineCount: a.lineCount
		});

		expect(moved.zones[1].lineIndex).toBe(1);
	});

	it('cleans blocks after zone removal', () => {
		let sheet = sheetWithZones(2);
		const created = createBlockFromZoneIds(sheet, [sheet.zones[0].id, sheet.zones[1].id]);
		sheet = removeZonesFromBlocks(
			{ ...created.sheet, zones: [created.sheet.zones[0]] },
			[created.sheet.zones[1].id]
		);

		expect(sheet.blocks).toHaveLength(0);
	});

	it('duplicates a block with offset zones', () => {
		let sheet = sheetWithZones(2);
		const created = createBlockFromZoneIds(sheet, [sheet.zones[0].id, sheet.zones[1].id]);
		sheet = created.sheet;

		const duplicated = duplicateBlock(sheet, created.blockId!);
		sheet = duplicated.sheet;

		expect(sheet.zones).toHaveLength(4);
		expect(sheet.blocks).toHaveLength(2);
	});

	it('pastes copied zones as a new block when multiple', () => {
		const sheet = sheetWithZones(2);
		const pasted = pasteZones(sheet, sheet.zones);

		expect(pasted.zoneIds).toHaveLength(2);
		expect(pasted.blockId).toBeTruthy();
		expect(pasted.sheet.zones).toHaveLength(4);
	});

	it('pastes a single zone without creating a block', () => {
		const sheet = sheetWithZones(1);
		const pasted = pasteZones(sheet, sheet.zones);

		expect(pasted.zoneIds).toHaveLength(1);
		expect(pasted.blockId).toBeNull();
		expect(pasted.sheet.zones).toHaveLength(2);
		expect(pasted.sheet.zones[1].id).not.toBe(sheet.zones[0].id);
	});

	it('removes blocks with fewer than two zones after partial cleanup', () => {
		let sheet = sheetWithZones(3);
		const created = createBlockFromZoneIds(sheet, [
			sheet.zones[0].id,
			sheet.zones[1].id,
			sheet.zones[2].id
		]);
		sheet = removeZonesFromBlocks(
			{ ...created.sheet, zones: [created.sheet.zones[0], created.sheet.zones[1]] },
			[created.sheet.zones[2].id]
		);

		expect(sheet.blocks).toHaveLength(1);
		expect(sheet.blocks[0].zoneIds).toHaveLength(2);
	});

	it('moves multiple selected zones by delta', () => {
		const sheet = sheetWithZones(2);
		const moved = moveZonesByDelta(sheet, [sheet.zones[0].id, sheet.zones[1].id], sheet.zones[0].id, {
			lineIndex: 2,
			leftCm: 3,
			widthCm: sheet.zones[0].widthCm,
			lineCount: sheet.zones[0].lineCount
		});

		expect(moved.zones[0].leftCm).toBe(3);
		expect(moved.zones[1].leftCm).toBe(4);
	});

	it('removes a block without deleting zones', () => {
		let sheet = sheetWithZones(2);
		const created = createBlockFromZoneIds(sheet, [sheet.zones[0].id, sheet.zones[1].id]);
		sheet = removeBlock(created.sheet, created.blockId!);

		expect(sheet.blocks).toHaveLength(0);
		expect(sheet.zones).toHaveLength(2);
	});
});
