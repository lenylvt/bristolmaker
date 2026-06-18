import { describe, expect, it } from 'vitest';
import {
	getActiveSheetKey,
	isActiveSheetKey,
	resetActiveSheetKey,
	setActiveSheetKey
} from './active-sheet.js';

describe('active-sheet', () => {
	it('tracks the active sheet key', () => {
		resetActiveSheetKey();
		expect(getActiveSheetKey()).toBeNull();
		setActiveSheetKey('sheet-a');
		expect(isActiveSheetKey('sheet-a')).toBe(true);
		expect(isActiveSheetKey('sheet-b')).toBe(false);
		resetActiveSheetKey();
		expect(getActiveSheetKey()).toBeNull();
	});
});
