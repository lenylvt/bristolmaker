export const HIGHLIGHT_COLOR_VARS = [
	'--color-1',
	'--color-2',
	'--color-3',
	'--color-4',
	'--color-5',
	'--color-6',
	'--color-7',
	'--color-8'
] as const;

export const TEXT_COLOR_VARS = ['--color-black', '--color-white', ...HIGHLIGHT_COLOR_VARS] as const;

export type TextColorVar = (typeof TEXT_COLOR_VARS)[number];
export type HighlightColorVar = (typeof HIGHLIGHT_COLOR_VARS)[number];

export type ListStyle = 'dash' | 'star' | 'decimal' | 'roman';

export type FormatCommand = 'bold' | 'italic' | 'underline';
