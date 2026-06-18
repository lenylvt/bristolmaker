export async function animateCardResize(
	element: HTMLElement,
	content: HTMLElement,
	instant = false
): Promise<void> {
	const startWidth = element.offsetWidth;
	const startHeight = element.offsetHeight;

	element.style.width = 'auto';
	element.style.height = 'auto';
	const targetWidth = content.offsetWidth;
	const targetHeight = content.offsetHeight;

	if (instant) {
		element.classList.add('t-resize-instant');
		element.style.width = `${targetWidth}px`;
		element.style.height = `${targetHeight}px`;
		void element.offsetWidth;
		element.classList.remove('t-resize-instant');
		return;
	}

	element.style.width = `${startWidth}px`;
	element.style.height = `${startHeight}px`;
	void element.offsetWidth;
	element.style.width = `${targetWidth}px`;
	element.style.height = `${targetHeight}px`;
}
