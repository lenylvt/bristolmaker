import type { ArrowDirection } from '$lib/zone/types.js';
import { hasZonesInClipboard } from '$lib/zone/clipboard.js';
import {
	getPrimarySelectedZoneId,
	getRemovedZoneIds,
	hasSelectionForClipboard,
	type SheetSelection
} from './sheet-selection.js';

export type SheetKeyAction =
	| { type: 'copy' }
	| { type: 'paste' }
	| { type: 'delete'; zoneIds: string[] }
	| { type: 'focus-editor'; zoneId: string }
	| { type: 'move'; direction: ArrowDirection }
	| { type: 'create-zone' }
	| { type: 'none' };

export type SheetKeyContext = {
	editable: boolean;
	isActiveSheet: boolean;
	selection: SheetSelection;
	sheet: import('$lib/zone/types.js').SheetData;
	isEventInZoneEditor: boolean;
};

function isShortcut(event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
	return (event.ctrlKey || event.metaKey) && !event.altKey;
}

export function resolveSheetKeyAction(
	event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
	context: SheetKeyContext
): SheetKeyAction {
	if (!context.editable) return { type: 'none' };

	const primaryId = getPrimarySelectedZoneId(context.sheet, context.selection);
	const editingZoneId = context.selection.editingZoneId;

	if (
		hasSelectionForClipboard(context.selection) &&
		editingZoneId === null &&
		!context.isEventInZoneEditor &&
		isShortcut(event) &&
		(event.key === 'c' || event.key === 'C')
	) {
		return { type: 'copy' };
	}

	if (
		context.isActiveSheet &&
		editingZoneId === null &&
		!context.isEventInZoneEditor &&
		isShortcut(event) &&
		(event.key === 'v' || event.key === 'V') &&
		hasZonesInClipboard()
	) {
		return { type: 'paste' };
	}

	if (primaryId && editingZoneId !== primaryId && !context.isEventInZoneEditor) {
		if (event.key === 'Delete' || event.key === 'Backspace') {
			return { type: 'delete', zoneIds: getRemovedZoneIds(context.sheet, context.selection) };
		}

		if (event.key === 'Enter' && !event.shiftKey) {
			return { type: 'focus-editor', zoneId: primaryId };
		}

		if (event.key === 'ArrowUp') return { type: 'move', direction: 'up' };
		if (event.key === 'ArrowDown') return { type: 'move', direction: 'down' };
		if (event.key === 'ArrowLeft') return { type: 'move', direction: 'left' };
		if (event.key === 'ArrowRight') return { type: 'move', direction: 'right' };
	}

	if (
		event.key === 'Enter' &&
		!event.shiftKey &&
		!context.isEventInZoneEditor &&
		editingZoneId === null
	) {
		if (!context.isActiveSheet) return { type: 'none' };
		if (primaryId && editingZoneId !== primaryId) return { type: 'none' };
		return { type: 'create-zone' };
	}

	return { type: 'none' };
}
