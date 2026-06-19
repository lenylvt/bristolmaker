import { describe, expect, it } from 'vitest';
import {
	isValidWorkspaceFile,
	readWorkspaceFile
} from './workspace-io.js';
import { createDefaultWorkspace, serializeWorkspace } from './workspace.js';

describe('workspace-io', () => {
	it('roundtrips workspace through file text', async () => {
		const sheets = createDefaultWorkspace();
		const raw = serializeWorkspace(sheets);
		const file = new File([raw], 'bristol-workspace.json', { type: 'application/json' });
		const imported = await readWorkspaceFile(file);
		expect(imported).toEqual(sheets);
	});

	it('rejects invalid workspace json', async () => {
		const file = new File(['{bad'], 'bristol-workspace.json', { type: 'application/json' });
		expect(await readWorkspaceFile(file)).toBeNull();
	});

	it('accepts json files by extension or mime', () => {
		expect(isValidWorkspaceFile(new File(['{}'], 'x.json', { type: 'text/plain' }))).toBe(true);
		expect(isValidWorkspaceFile(new File(['{}'], 'x.txt', { type: 'application/json' }))).toBe(
			true
		);
		expect(isValidWorkspaceFile(new File(['{}'], 'x.txt', { type: 'text/plain' }))).toBe(false);
	});

	it('serializes export payload as valid workspace json', () => {
		const sheets = createDefaultWorkspace();
		const raw = serializeWorkspace(sheets);
		expect(raw).toContain('"version":1');
		expect(raw).toContain('"sheets"');
	});
});
