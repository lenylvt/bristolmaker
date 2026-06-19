export function getDropdownCloseMs(root: Element | null = defaultDropdownRoot()): number {
	if (!root || typeof getComputedStyle === 'undefined') return 150;

	const raw = getComputedStyle(root).getPropertyValue('--dropdown-close-dur').trim();
	const parsed = Number.parseFloat(raw);
	return Number.isFinite(parsed) ? parsed : 150;
}

function defaultDropdownRoot(): Element | null {
	if (typeof document === 'undefined') return null;
	return document.documentElement;
}

export function openDropdown(el: HTMLElement): void {
	el.classList.remove('is-closing');
	el.classList.add('is-open');
}

export function closeDropdown(el: HTMLElement, onClosed?: () => void): void {
	el.classList.remove('is-open');
	el.classList.add('is-closing');
	const closeMs = getDropdownCloseMs();
	setTimeout(() => {
		el.classList.remove('is-closing');
		onClosed?.();
	}, closeMs);
}

export function isDropdownOpen(el: HTMLElement): boolean {
	return el.classList.contains('is-open');
}
