export const MAX_SHEETS = 30;

/** Clamp and parse sheet count for Bristol packs (max 30 sheets). */
export function parseSheetCount(value: string, current = 1): number {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return current;
	}

	return Math.min(parsed, MAX_SHEETS);
}
