export function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export function plainLinesToHtml(text: string): string {
	if (!text) return '';
	return text
		.split('\n')
		.map((line) => (line ? escapeHtml(line) : ''))
		.join('<br>');
}

export function htmlToPlainLines(html: string): string {
	if (typeof DOMParser !== 'undefined') {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		return doc.body.innerText;
	}

	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/div>/gi, '\n')
		.replace(/<[^>]+>/g, '');
}
