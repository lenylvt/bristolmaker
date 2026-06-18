import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['b', 'i', 'u', 'span', 'mark', 'code', 'ul', 'ol', 'li', 'br', 'div', 'p'];
const ALLOWED_ATTR = ['style', 'class'];

export function sanitizeEditorHtml(html: string): string {
	if (!html) return '';
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR
	});
}
