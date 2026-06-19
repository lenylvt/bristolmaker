import { createEmptySheet, type SheetData } from '$lib/zone/index.js';

export const WORKSPACE_STORAGE_KEY = 'bristolmaker-workspace';
export const WORKSPACE_VERSION = 1;

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
		if (!parsed || parsed.version !== WORKSPACE_VERSION || !Array.isArray(parsed.sheets)) {
			return null;
		}
		return parsed.sheets.map(normalizeSheet);
	} catch {
		return null;
	}
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
