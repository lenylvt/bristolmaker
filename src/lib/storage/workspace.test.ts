import { describe, expect, it } from 'vitest';
import {
	createDefaultWorkspace,
	loadWorkspaceFromStorage,
	normalizeSheet,
	parseWorkspace,
	saveWorkspaceToStorage,
	WORKSPACE_STORAGE_KEY,
	WORKSPACE_VERSION
} from '$lib/storage/workspace.js';
import { createEmptySheet, createWriteZone } from '$lib/zone/index.js';

class MemoryStorage implements Storage {
	private store = new Map<string, string>();

	get length() {
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
	}

	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}

	key(index: number): string | null {
		return [...this.store.keys()][index] ?? null;
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}

	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}

	setItemThrows(key: string, value: string): void {
		throw new DOMException('QuotaExceededError', 'QuotaExceededError');
	}
}

describe('workspace storage', () => {
	it('serializes and parses sheets with blocks', () => {
		const sheet = createEmptySheet();
		const a = createWriteZone({ lineIndex: 1, leftCm: 1, content: 'test-a', id: 'zone-a' });
		const b = createWriteZone({ lineIndex: 2, leftCm: 2, content: 'test-b', id: 'zone-b' });
		const payload = {
			version: WORKSPACE_VERSION,
			sheets: [
				{
					...sheet,
					zones: [a, b],
					blocks: [{ id: 'block-legacy', zoneIds: [a.id, b.id] }]
				}
			]
		};

		const parsed = parseWorkspace(JSON.stringify(payload));
		expect(parsed).toHaveLength(1);
		expect(parsed?.[0].blocks).toHaveLength(1);
		expect(parsed?.[0].zones[0].content).toBe('test-a');
	});

	it('loads and saves through storage adapter', () => {
		const storage = new MemoryStorage();
		const sheets = createDefaultWorkspace();
		saveWorkspaceToStorage(sheets, storage);

		expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toContain(`"version":${WORKSPACE_VERSION}`);
		expect(loadWorkspaceFromStorage(storage)).toEqual(sheets);
	});

	it('returns null for invalid workspace json', () => {
		expect(parseWorkspace('not-json')).toBeNull();
	});

	it('migrates v1 workspaces to a single compact continuous sheet', () => {
		const sheet = createEmptySheet();
		const zone = createWriteZone({ lineIndex: 36, leftCm: 0, widthCm: 5 });
		const migrated = parseWorkspace(
			JSON.stringify({ version: 1, sheets: [{ ...sheet, zones: [zone], blocks: [] }] })
		);

		expect(migrated).toHaveLength(1);
		expect(migrated?.[0].zones[0].lineIndex).toBe(42);
	});

	it('returns null for unsupported workspace version', () => {
		expect(parseWorkspace(JSON.stringify({ version: 99, sheets: [] }))).toBeNull();
	});

	it('does not throw when storage quota is exceeded', () => {
		const storage = new MemoryStorage();
		storage.setItem = storage.setItemThrows;
		expect(() => saveWorkspaceToStorage(createDefaultWorkspace(), storage)).not.toThrow();
	});

	it('creates unique zone ids after reload roundtrip', () => {
		const storage = new MemoryStorage();
		const sheet = createEmptySheet();
		const existing = createWriteZone({ lineIndex: 1, leftCm: 1, content: 'saved' });
		saveWorkspaceToStorage([{ ...sheet, zones: [existing] }], storage);

		const loaded = loadWorkspaceFromStorage(storage);
		expect(loaded).toHaveLength(1);

		const created = createWriteZone({ lineIndex: 2, leftCm: 2, content: 'new' });
		const allIds = [...loaded![0].zones.map((zone) => zone.id), created.id];
		expect(new Set(allIds).size).toBe(allIds.length);
	});

	it('purges orphan block zone ids on normalize', () => {
		const sheet = createEmptySheet();
		const zone = createWriteZone({ lineIndex: 1, leftCm: 1, id: 'zone-a' });
		const normalized = normalizeSheet({
			...sheet,
			zones: [zone],
			blocks: [{ id: 'block-1', zoneIds: ['zone-a', 'missing-zone'] }]
		});

		expect(normalized.blocks).toHaveLength(0);
	});

	it('keeps blocks with two valid zones after normalize', () => {
		const sheet = createEmptySheet();
		const a = createWriteZone({ lineIndex: 1, leftCm: 1, id: 'zone-a' });
		const b = createWriteZone({ lineIndex: 2, leftCm: 2, id: 'zone-b' });
		const normalized = normalizeSheet({
			...sheet,
			zones: [a, b],
			blocks: [{ id: 'block-1', zoneIds: ['zone-a', 'zone-b', 'missing'] }]
		});

		expect(normalized.blocks).toHaveLength(1);
		expect(normalized.blocks[0].zoneIds).toEqual(['zone-a', 'zone-b']);
	});
});
