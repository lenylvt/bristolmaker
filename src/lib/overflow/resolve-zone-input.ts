import {
	measureContentLineCount,
	measureEditorLineCount,
	measureExplicitLineCount
} from '$lib/zone/measure.js';
import { splitZoneEditorOverflow } from './split-editor.js';

export type ZoneInputPlan =
	| { type: 'noop' }
	| { type: 'expand'; lineCount: number }
	| { type: 'split'; lineCount: number; current: string; overflow: string };

export function planZoneInputOverflow(
	editor: HTMLElement,
	zoneLineCount: number,
	maxLines: number
): ZoneInputPlan {
	const explicitLines = measureExplicitLineCount(editor);
	const requiredLines = Math.min(
		maxLines,
		Math.max(measureEditorLineCount(editor, zoneLineCount), measureContentLineCount(editor))
	);

	const fitsVisually = editor.scrollHeight <= editor.clientHeight + 1;

	if (explicitLines <= maxLines && fitsVisually && requiredLines <= zoneLineCount) {
		return { type: 'noop' };
	}

	if (requiredLines > zoneLineCount) {
		return { type: 'expand', lineCount: requiredLines };
	}

	if (fitsVisually && explicitLines <= maxLines) {
		return { type: 'noop' };
	}

	const split = splitZoneEditorOverflow(editor, maxLines);
	if (!split.overflow) {
		if (split.lineCount !== zoneLineCount) {
			return { type: 'expand', lineCount: split.lineCount };
		}
		return { type: 'noop' };
	}

	return {
		type: 'split',
		lineCount: split.lineCount,
		current: split.current,
		overflow: split.overflow
	};
}
