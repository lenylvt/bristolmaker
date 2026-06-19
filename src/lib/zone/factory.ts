import { DEFAULT_ZONE_WIDTH_CM, MIN_ZONE_LINES, type SheetData, type WriteZone } from './types.js';

export function createEntityId(prefix: string): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createZoneId(): string {
	return createEntityId('zone');
}

export function createSheetId(): string {
	return createEntityId('sheet');
}

export function createEmptySheet(): SheetData {
	return { id: createSheetId(), zones: [], blocks: [] };
}

export function cloneWriteZone(zone: WriteZone, patch: Partial<WriteZone> = {}): WriteZone {
	return createWriteZone({
		lineIndex: patch.lineIndex ?? zone.lineIndex,
		leftCm: patch.leftCm ?? zone.leftCm,
		widthCm: patch.widthCm ?? zone.widthCm,
		lineCount: patch.lineCount ?? zone.lineCount,
		content: patch.content ?? zone.content
	});
}

export function createWriteZone(input: {
	lineIndex: number;
	leftCm: number;
	widthCm?: number;
	lineCount?: number;
	content?: string;
	id?: string;
}): WriteZone {
	return {
		id: input.id ?? createZoneId(),
		lineIndex: input.lineIndex,
		leftCm: round(input.leftCm),
		widthCm: round(input.widthCm ?? DEFAULT_ZONE_WIDTH_CM),
		lineCount: input.lineCount ?? MIN_ZONE_LINES,
		content: input.content ?? ''
	};
}

function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}
