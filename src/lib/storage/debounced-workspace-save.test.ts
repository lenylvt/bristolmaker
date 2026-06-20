import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createDebouncedWorkspaceSave } from './debounced-workspace-save.js';
import { WORKSPACE_STORAGE_KEY, WORKSPACE_VERSION } from './workspace.js';
import { createDefaultWorkspace } from './workspace.js';

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
}

describe('debounced workspace save', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('debounces repeated schedule calls', () => {
		const storage = new MemoryStorage();
		const saver = createDebouncedWorkspaceSave(300, storage);
		const sheets = createDefaultWorkspace();

		saver.schedule(sheets);
		saver.schedule(sheets);
		expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();

		vi.advanceTimersByTime(300);
		expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toContain(`"version":${WORKSPACE_VERSION}`);
	});

	it('flushes immediately', () => {
		const storage = new MemoryStorage();
		const saver = createDebouncedWorkspaceSave(300, storage);
		const sheets = createDefaultWorkspace();

		saver.flush(sheets);
		expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toContain(`"version":${WORKSPACE_VERSION}`);
	});
});
