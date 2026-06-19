import { cloneWriteZone } from './factory.js';
import type { WriteZone } from './types.js';

export const ZONE_CLIPBOARD_MIME = 'application/x-bristol-zones';

export type ZoneClipboardData = {
	zones: WriteZone[];
};

let memoryClipboard: ZoneClipboardData | null = null;

export function copyZonesToClipboard(zones: WriteZone[]): void {
	if (zones.length === 0) return;
	memoryClipboard = {
		zones: zones.map((zone) => cloneWriteZone(zone))
	};
}

export function readZonesFromClipboard(): WriteZone[] | null {
	return memoryClipboard?.zones.map((zone) => cloneWriteZone(zone)) ?? null;
}

export function hasZonesInClipboard(): boolean {
	return (memoryClipboard?.zones.length ?? 0) > 0;
}

export function clearZoneClipboard(): void {
	memoryClipboard = null;
}
