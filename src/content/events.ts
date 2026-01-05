import type {
	SubmissionEvent,
	ContentMessage,
	BackgroundMessage,
	ShockCommand,
} from "../types/events";

// ─────────────────────────────────────────────────────────────────────────────
// Submission event listener
// ─────────────────────────────────────────────────────────────────────────────

type SubmissionHandler = (event: SubmissionEvent) => void;
const handlers: Set<SubmissionHandler> = new Set();

browser.runtime.onMessage.addListener((message: unknown) => {
	const msg = message as ContentMessage;
	if (msg.type === "submission") {
		handlers.forEach((handler) => handler(msg.payload));
	}
});

/**
 * Subscribe to submission events from LeetCode.
 * Returns an unsubscribe function.
 */
export function onSubmission(handler: SubmissionHandler): () => void {
	handlers.add(handler);
	return () => handlers.delete(handler);
}

// ─────────────────────────────────────────────────────────────────────────────
// Send commands to background
// ─────────────────────────────────────────────────────────────────────────────

function sendToBackground(message: BackgroundMessage): void {
	browser.runtime.sendMessage(message).catch(console.error);
}

/**
 * Send a shock or vibrate command to the PiShock device.
 */
function sendShock(command: ShockCommand): void {
	sendToBackground({ type: "shock", payload: command });
}

/**
 * Convenience: send a shock with the given intensity and duration.
 */
export function shock(intensity: number, duration: number): void {
	sendShock({ action: "shock", intensity, duration });
}

/**
 * Convenience: send a vibration with the given intensity and duration.
 */
export function vibrate(intensity: number, duration: number): void {
	sendShock({ action: "vibrate", intensity, duration });
}

/**
 * Trigger a test vibration using saved settings.
 */
export function testVibrate(): void {
	sendToBackground({ type: "testVibrate" });
}
