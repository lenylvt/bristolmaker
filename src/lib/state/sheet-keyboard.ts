import { getActiveSheetKey } from './active-sheet.js';

type KeydownHandler = (event: KeyboardEvent) => void;

const handlers = new Map<string, KeydownHandler>();
let listenerAttached = false;

function dispatchKeydown(event: KeyboardEvent) {
	const key = getActiveSheetKey();
	if (!key) return;
	handlers.get(key)?.(event);
}

export function dispatchActiveSheetKeydown(event: KeyboardEvent): void {
	dispatchKeydown(event);
}

function ensureListener() {
	if (listenerAttached || typeof document === 'undefined') return;
	document.addEventListener('keydown', dispatchKeydown);
	listenerAttached = true;
}

export function registerSheetKeydown(sheetKey: string, handler: KeydownHandler): () => void {
	handlers.set(sheetKey, handler);
	ensureListener();

	return () => {
		if (handlers.get(sheetKey) === handler) {
			handlers.delete(sheetKey);
		}
	};
}
