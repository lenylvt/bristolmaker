let activeSheetKey: string | null = null;

export function setActiveSheetKey(key: string): void {
	activeSheetKey = key;
}

export function getActiveSheetKey(): string | null {
	return activeSheetKey;
}

export function isActiveSheetKey(key: string): boolean {
	return activeSheetKey === key;
}

export function resetActiveSheetKey(): void {
	activeSheetKey = null;
}
