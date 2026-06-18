export const VIEWPORT_MIN_SCALE = 0.5;
export const VIEWPORT_MAX_SCALE = 3;
export const VIEWPORT_ZOOM_SENSITIVITY = 0.006;

export function clampScale(scale: number): number {
	return Math.min(VIEWPORT_MAX_SCALE, Math.max(VIEWPORT_MIN_SCALE, scale));
}

/** Zoom multiplicatif — réactif au ctrl + molette. */
export function zoomFromWheel(currentScale: number, deltaY: number): number {
	const factor = Math.exp(-deltaY * VIEWPORT_ZOOM_SENSITIVITY);
	return clampScale(currentScale * factor);
}

export function isPanSurfaceTarget(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false;
	return !target.closest('button, textarea, .bristol-sheet, a, input, label');
}
