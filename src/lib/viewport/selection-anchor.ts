export type SelectionAnchor = {
	top: number;
	left: number;
};

export type AnchorRect = Pick<DOMRect, 'top' | 'left' | 'right'>;

export function computeAnchorFromRects(rects: AnchorRect[]): SelectionAnchor | null {
	if (rects.length === 0) return null;

	const top = Math.min(...rects.map((rect) => rect.top));
	const left = Math.min(...rects.map((rect) => rect.left));
	const right = Math.max(...rects.map((rect) => rect.right));
	return { top, left: (left + right) / 2 };
}

export function computeSelectionAnchor(
	root: ParentNode | null,
	zoneIds: string[]
): SelectionAnchor | null {
	if (!root || zoneIds.length === 0) return null;

	const rects: AnchorRect[] = [];
	for (const id of zoneIds) {
		const el = root.querySelector(`[data-zone-id="${id}"]`);
		if (el) rects.push(el.getBoundingClientRect());
	}

	return computeAnchorFromRects(rects);
}

export function trackSelectionAnchor(options: {
	getRoot: () => ParentNode | null;
	getZoneIds: () => string[];
	onAnchorChange: (anchor: SelectionAnchor | null) => void;
}): () => void {
	let frame = 0;

	const update = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			const anchor = computeSelectionAnchor(options.getRoot(), options.getZoneIds());
			options.onAnchorChange(anchor);
		});
	};

	update();

	const root = options.getRoot();
	const viewport = root instanceof HTMLElement ? root.closest('.viewport') : null;

	viewport?.addEventListener('scroll', update, { passive: true });
	window.addEventListener('resize', update, { passive: true });

	return () => {
		cancelAnimationFrame(frame);
		viewport?.removeEventListener('scroll', update);
		window.removeEventListener('resize', update);
	};
}
