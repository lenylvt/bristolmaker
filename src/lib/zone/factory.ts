import { DEFAULT_ZONE_WIDTH_CM, MIN_ZONE_LINES, type SheetData, type WriteZone } from './types.js';

let zoneIdCounter = 0;

export function createZoneId(): string {
	zoneIdCounter += 1;
	return `zone-${zoneIdCounter}`;
}

export function resetZoneIdCounter(): void {
	zoneIdCounter = 0;
}

export function createSheetId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `sheet-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptySheet(): SheetData {
	return { id: createSheetId(), zones: [] };
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
