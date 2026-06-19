import { parseWorkspace, serializeWorkspace, WORKSPACE_VERSION } from './workspace.js';
import type { SheetData } from '$lib/zone/index.js';

export const WORKSPACE_FILE_NAME = 'bristol-workspace.json';
export const WORKSPACE_MIME = 'application/json';

export function exportWorkspaceFile(sheets: SheetData[], filename = WORKSPACE_FILE_NAME): void {
	const blob = new Blob([serializeWorkspace(sheets)], { type: WORKSPACE_MIME });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

export async function readWorkspaceFile(file: File): Promise<SheetData[] | null> {
	const raw = await file.text();
	return parseWorkspace(raw);
}

export function isValidWorkspaceFile(file: File): boolean {
	return file.type === WORKSPACE_MIME || file.name.endsWith('.json');
}

export function workspaceFileLabel(): string {
	return `Bristol v${WORKSPACE_VERSION}`;
}
