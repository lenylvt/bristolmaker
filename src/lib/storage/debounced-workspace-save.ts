import type { SheetData } from '$lib/zone/index.js';
import { saveWorkspaceToStorage } from './workspace.js';

export function createDebouncedWorkspaceSave(
	delayMs = 300,
	storage: Storage = localStorage
) {
	let timer: ReturnType<typeof setTimeout> | null = null;

	const persist = (sheets: SheetData[]) => {
		saveWorkspaceToStorage(sheets, storage);
	};

	return {
		schedule(sheets: SheetData[]) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				persist(sheets);
				timer = null;
			}, delayMs);
		},
		flush(sheets: SheetData[]) {
			if (timer) clearTimeout(timer);
			timer = null;
			persist(sheets);
		},
		dispose() {
			if (timer) clearTimeout(timer);
			timer = null;
		}
	};
}
