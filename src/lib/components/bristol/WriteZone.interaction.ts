export function shouldEnterEditOnDoubleClick(editing: boolean): boolean {
	return !editing;
}

export function shouldPreventEditorPointerDefault(selected: boolean, clickCount: number): boolean {
	return !selected && clickCount < 2;
}
