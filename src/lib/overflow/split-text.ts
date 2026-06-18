export function splitOverflowText(
	text: string,
	maxLines: number
): { current: string; overflow: string } {
	const lines = text.split('\n');

	if (lines.length <= maxLines) {
		return { current: text, overflow: '' };
	}

	return {
		current: lines.slice(0, maxLines).join('\n'),
		overflow: lines.slice(maxLines).join('\n')
	};
}
