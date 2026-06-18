import type { FormatCommand } from './colors.js';

export function isFormatShortcut(event: KeyboardEvent): boolean {
	return (event.ctrlKey || event.metaKey) && !event.altKey;
}

export function getShortcutCommand(event: KeyboardEvent): FormatCommand | null {
	if (!isFormatShortcut(event)) return null;
	const key = event.key.toLowerCase();
	if (key === 'b') return 'bold';
	if (key === 'i') return 'italic';
	if (key === 'u') return 'underline';
	return null;
}

export function listStyleClass(style: import('./colors.js').ListStyle): string {
	switch (style) {
		case 'dash':
			return 'list-dash';
		case 'star':
			return 'list-star';
		case 'decimal':
			return 'list-decimal';
		case 'roman':
			return 'list-roman';
	}
}
