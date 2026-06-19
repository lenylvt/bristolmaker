import { describe, expect, it } from 'vitest';
import { createDefaultWorkspace, serializeWorkspace } from '$lib/storage/workspace.js';
import { readWorkspaceFile } from '$lib/storage/workspace-io.js';

describe('WorkspaceMenu data flow', () => {
	it('imports a workspace file into sheet state shape', async () => {
		const sheets = createDefaultWorkspace();
		const file = new File([serializeWorkspace(sheets)], 'bristol-workspace.json', {
			type: 'application/json'
		});
		const imported = await readWorkspaceFile(file);
		expect(imported?.[0].zones).toEqual([]);
		expect(imported?.[0].blocks).toEqual([]);
	});
});
