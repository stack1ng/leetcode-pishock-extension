const CODE_EDITOR_SELECTOR = '[data-track-load="code_editor"]';

/**
 * Get the LeetCode code editor element.
 */
export function getCodeEditor(): HTMLElement | null {
	return document.querySelector<HTMLElement>(CODE_EDITOR_SELECTOR);
}

/**
 * Check if an element (or event target) is inside the code editor.
 */
export function isInsideCodeEditor(target: Node | EventTarget | null): boolean {
	if (!target || !(target instanceof Node)) return false;
	const codeEditor = getCodeEditor();
	return codeEditor?.contains(target) ?? false;
}
