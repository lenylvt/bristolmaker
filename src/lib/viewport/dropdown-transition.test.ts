import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	closeDropdown,
	getDropdownCloseMs,
	isDropdownOpen,
	openDropdown
} from './dropdown-transition.js';

function createDropdownEl() {
	const classes = new Set<string>();
	return {
		classList: {
			add: (...names: string[]) => names.forEach((name) => classes.add(name)),
			remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
			contains: (name: string) => classes.has(name)
		}
	} as unknown as HTMLElement;
}

function createStyleRoot(closeDur = '150ms') {
	return {
		getPropertyValue: (name: string) => (name === '--dropdown-close-dur' ? closeDur : '')
	} as unknown as CSSStyleDeclaration;
}

describe('dropdown-transition', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reads close duration from css variable', () => {
		const root = { style: createStyleRoot() } as unknown as Element;
		vi.stubGlobal('getComputedStyle', () => createStyleRoot());
		expect(getDropdownCloseMs(root)).toBe(150);
		vi.unstubAllGlobals();
	});

	it('opens and closes with transition classes', () => {
		const el = createDropdownEl();
		openDropdown(el);
		expect(isDropdownOpen(el)).toBe(true);

		const onClosed = vi.fn();
		closeDropdown(el, onClosed);
		expect(el.classList.contains('is-closing')).toBe(true);
		expect(isDropdownOpen(el)).toBe(false);

		vi.advanceTimersByTime(150);
		expect(el.classList.contains('is-closing')).toBe(false);
		expect(onClosed).toHaveBeenCalled();
	});
});
