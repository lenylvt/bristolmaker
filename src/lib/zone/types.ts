export const MIN_ZONE_WIDTH_CM = 1;
export const DEFAULT_ZONE_WIDTH_CM = 5;
export const MIN_ZONE_LINES = 1;

export type WriteZone = {
	id: string;
	lineIndex: number;
	leftCm: number;
	widthCm: number;
	lineCount: number;
	content: string;
};

export type SheetData = {
	id: string;
	zones: WriteZone[];
};

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type SheetPointCm = {
	xCm: number;
	yCm: number;
};

export type ZoneGeometry = Pick<WriteZone, 'lineIndex' | 'leftCm' | 'widthCm' | 'lineCount'>;

export type ZonePlacement = {
	lineIndex: number;
	leftCm: number;
};

export const ZONE_ARROW_STEP_CM = 0.5;

export type ArrowDirection = 'up' | 'down' | 'left' | 'right';
