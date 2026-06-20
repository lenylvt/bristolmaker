import { createEmptySheet, type SheetData } from '$lib/zone/index.js';
import { mergeSheetsToContinuous, migrateZonesToCompactLayout } from '$lib/bristol/continuous.js';

export const WORKSPACE_STORAGE_KEY = 'bristolmaker-workspace';
export const WORKSPACE_VERSION = 2;

export type WorkspaceSnapshot = {
	version: number;
	sheets: SheetData[];
};

export function normalizeSheet(sheet: SheetData): SheetData {
	const zones = sheet.zones ?? [];
	const zoneIds = new Set(zones.map((zone) => zone.id));
	const blocks = (sheet.blocks ?? [])
		.map((block) => ({
			...block,
			zoneIds: block.zoneIds.filter((id) => zoneIds.has(id))
		}))
		.filter((block) => block.zoneIds.length >= 2);

	return {
		id: sheet.id,
		zones,
		blocks
	};
}

export function serializeWorkspace(sheets: SheetData[]): string {
	const snapshot: WorkspaceSnapshot = {
		version: WORKSPACE_VERSION,
		sheets: sheets.map(normalizeSheet)
	};
	return JSON.stringify(snapshot);
}

export function parseWorkspace(raw: string): SheetData[] | null {
	try {
		const parsed = JSON.parse(raw) as WorkspaceSnapshot;
		if (!parsed || !Array.isArray(parsed.sheets)) {
			return null;
		}

		if (parsed.version === 1) {
			return migrateWorkspaceV1(parsed.sheets);
		}

		if (parsed.version !== WORKSPACE_VERSION) {
			return null;
		}

		return parsed.sheets.map(normalizeSheet);
	} catch {
		return null;
	}
}

function migrateWorkspaceV1(sheets: SheetData[]): SheetData[] {
	const merged = mergeSheetsToContinuous(sheets.map(normalizeSheet));
	return [normalizeSheet({ ...merged, zones: migrateZonesToCompactLayout(merged.zones) })];
}

export function loadWorkspaceFromStorage(storage: Storage = localStorage): SheetData[] | null {
	const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
	if (!raw) return null;
	return parseWorkspace(raw);
}

export function saveWorkspaceToStorage(sheets: SheetData[], storage: Storage = localStorage): void {
	try {
		storage.setItem(WORKSPACE_STORAGE_KEY, serializeWorkspace(sheets));
	} catch {
		// QuotaExceededError or private browsing — skip silent save failure
	}
}

export function createDefaultWorkspace(): SheetData[] {
	return [createEmptySheet()];
}
