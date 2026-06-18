import { describe, expect, it, vi } from 'vitest';
import { dispatchActiveSheetKeydown, registerSheetKeydown } from './sheet-keyboard.js';
import { resetActiveSheetKey, setActiveSheetKey } from './active-sheet.js';

describe('sheet-keyboard', () => {
	it('dispatches keydown only to the active sheet handler', () => {
		resetActiveSheetKey();
		const handlerA = vi.fn();
		const handlerB = vi.fn();
		const unregisterA = registerSheetKeydown('sheet-a', handlerA);
		registerSheetKeydown('sheet-b', handlerB);

		setActiveSheetKey('sheet-a');
		dispatchActiveSheetKeydown({ key: 'Enter' } as KeyboardEvent);
		expect(handlerA).toHaveBeenCalledTimes(1);
		expect(handlerB).not.toHaveBeenCalled();

		unregisterA();
		resetActiveSheetKey();
	});
});
