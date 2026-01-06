import cssText from "data-text:~styles/content.css";
import type { PlasmoCSConfig, PlasmoGetOverlayAnchor } from "plasmo";
import {
	Suspense,
	useCallback,
	useEffect,
	useState,
	useSyncExternalStore,
	type ComponentProps,
} from "react";
import { createPortal } from "react-dom";
import { toast, Toaster } from "sonner";
import { useCountdown } from "usehooks-ts";

import { Storage } from "@plasmohq/storage";

import { cn } from "~lib/utils";
import {
	DEFAULT_SETTINGS,
	type ContentMessage,
	type Settings,
	type SubmissionEvent,
} from "~lib/settings";

// ─────────────────────────────────────────────────────────────────────────────
// Plasmo Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const config: PlasmoCSConfig = {
	matches: ["https://leetcode.com/problems/*"],
	run_at: "document_idle",
};

export const getStyle = () => {
	const style = document.createElement("style");
	style.textContent = cssText;
	return style;
};

// Use overlay anchor for absolute positioning within the code editor
export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () =>
	document.querySelector('[data-track-load="code_editor"]');

// ─────────────────────────────────────────────────────────────────────────────
// Storage and Settings
// ─────────────────────────────────────────────────────────────────────────────

const storage = new Storage();

// Global settings store with cached promise for Suspense
const settingsStore = (() => {
	let settings: Settings | null = null;
	let promise: Promise<Settings> | null = null;
	let error: unknown = null;
	let watchersSetup = false;
	const listeners = new Set<() => void>();

	async function loadSettings(): Promise<Settings> {
		const stored: Partial<Settings> = {};
		for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
			const value = await storage.get(key);
			if (value !== undefined) {
				(stored as Record<keyof Settings, unknown>)[key] = value;
			}
		}
		return { ...DEFAULT_SETTINGS, ...stored };
	}

	function setupWatchers() {
		if (watchersSetup) return;
		watchersSetup = true;
		const watchers: Record<string, (c: { newValue: unknown }) => void> = {};
		for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
			watchers[key] = (c: { newValue: unknown }) => {
				if (settings) {
					settings = {
						...settings,
						[key]: c.newValue ?? DEFAULT_SETTINGS[key],
					};
					listeners.forEach((l) => l());
				}
			};
		}
		storage.watch(watchers);
	}

	function ensurePromise(): Promise<Settings> {
		if (!promise) {
			promise = loadSettings()
				.then((s) => {
					settings = s;
					setupWatchers();
					return s;
				})
				.catch((e) => {
					error = e;
					throw e;
				});
		}
		return promise;
	}

	return {
		read(): Settings {
			if (error) throw error;
			if (settings) return settings;
			throw ensurePromise();
		},
		getSnapshot: () => settings,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
})();

function useSettings(): Settings {
	// Suspend until settings are loaded (throws promise if not ready)
	const initialSettings = settingsStore.read();

	// Subscribe to live updates
	return useSyncExternalStore(
		settingsStore.subscribe,
		() => settingsStore.getSnapshot() ?? initialSettings
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM Helpers
// ─────────────────────────────────────────────────────────────────────────────

const CODE_EDITOR_SELECTOR = '[data-track-load="code_editor"]';
const TOAST_CONTAINER_ID = "leetcode-pishock-toasts";

function isInsideCodeEditor(target: Node | EventTarget | null): boolean {
	if (!target || !(target instanceof Node)) return false;
	const codeEditor = document.querySelector<HTMLElement>(CODE_EDITOR_SELECTOR);
	return codeEditor?.contains(target) ?? false;
}

// Get or create a container in the main document for viewport-relative toasts
function getToastContainer(): HTMLElement {
	let container = document.getElementById(TOAST_CONTAINER_ID);
	if (!container) {
		container = document.createElement("div");
		container.id = TOAST_CONTAINER_ID;
		document.body.appendChild(container);
	}
	return container;
}

// Component that portals the Toaster to the main document
function ViewportToaster(props: ComponentProps<typeof Toaster>) {
	const [container, setContainer] = useState<HTMLElement | null>(null);

	useEffect(() => {
		setContainer(getToastContainer());
		return () => {
			const el = document.getElementById(TOAST_CONTAINER_ID);
			if (el && el.childNodes.length === 0) {
				el.remove();
			}
		};
	}, []);

	if (!container) return null;

	return createPortal(<Toaster {...props} />, container);
}

// ─────────────────────────────────────────────────────────────────────────────
// Submission Event Handling
// ─────────────────────────────────────────────────────────────────────────────

type SubmissionHandler = (event: SubmissionEvent) => void;
const handlers = new Set<SubmissionHandler>();

function onSubmission(handler: SubmissionHandler): () => void {
	handlers.add(handler);
	return () => handlers.delete(handler);
}

function shock(intensity: number, duration: number): void {
	chrome.runtime.sendMessage({
		type: "shock",
		payload: { action: "shock", intensity, duration },
	});
}

function vibrate(intensity: number, duration: number): void {
	chrome.runtime.sendMessage({
		type: "vibrate",
		payload: { action: "vibrate", intensity, duration },
	});
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message: unknown) => {
	const msg = message as ContentMessage;
	if (msg.type === "submission") {
		handlers.forEach((handler) => handler(msg.payload));
	}
});

// ─────────────────────────────────────────────────────────────────────────────
// Overlay Component
// ─────────────────────────────────────────────────────────────────────────────

function ShockerOverlay() {
	const {
		shockIntervalSeconds,
		initialShockIntensity,
		initialShockDuration,
		incrementalIntensityStep,
		incrementalDurationStep,

		vibrateIntensity,
		vibrateDuration,

		shockOnFinalFail,
		shockOnTestFail,
	} = useSettings();

	const [isSuccessful, setIsSuccessful] = useState(false);
	const [hasFocusedCodeEditor, setHasFocusedCodeEditor] = useState(false);

	const [count, { startCountdown, stopCountdown, resetCountdown }] =
		useCountdown({
			countStart: shockIntervalSeconds,
			countStop: 0,
			intervalMs: 1000,
		});

	// Detect clicks on the code editor without blocking them
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (hasFocusedCodeEditor) return;
			if (isInsideCodeEditor(e.target)) {
				setHasFocusedCodeEditor(true);
			}
		};

		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [hasFocusedCodeEditor]);

	useEffect(() => {
		if (hasFocusedCodeEditor && shockIntervalSeconds) startCountdown();
	}, [hasFocusedCodeEditor, startCountdown]);

	useEffect(() => {
		if (isSuccessful) {
			stopCountdown();
			vibrate(vibrateIntensity, vibrateDuration);
		}
	}, [isSuccessful, stopCountdown]);

	const [intensity, _setIntensity] = useState(initialShockIntensity);
	const setIntensity = useCallback((value: number) => {
		_setIntensity(Math.min(Math.max(value, 0), 100));
	}, []);
	const [duration, setDuration] = useState(initialShockDuration);

	const incrementalShock = useCallback(() => {
		toast.success(`⚡ Shocking you @ ${intensity}% ⚡`);
		setIntensity(intensity + incrementalIntensityStep);
		setDuration(duration + incrementalDurationStep);
		shock(intensity, duration);
	}, [
		intensity,
		duration,
		incrementalIntensityStep,
		incrementalDurationStep,
		setIntensity,
	]);

	useEffect(() => {
		if (count === 0 && shockIntervalSeconds) {
			incrementalShock();
			resetCountdown();
			startCountdown();
		}
	}, [count, incrementalShock, resetCountdown, startCountdown]);

	useEffect(() => {
		const unsubscribe = onSubmission((event) => {
			console.log("Submission event:", event);
			switch (event.kind) {
				case "final":
					setIsSuccessful(event.success);
					if (shockOnFinalFail && !event.success) incrementalShock();

					break;
				case "test":
					if (shockOnTestFail && !event.success) incrementalShock();

					break;
			}
		});

		return unsubscribe;
	}, [incrementalShock]);

	const remainingMinutes = Math.floor(count / 60);
	const remainingSeconds = count % 60;

	const [codeEditorRect, setCodeEditorRect] = useState<DOMRect>(null);
	const codeEditor = document.querySelector<HTMLElement>(CODE_EDITOR_SELECTOR);
	useEffect(() => {
		const computeWidth = () => {
			setCodeEditorRect(codeEditor?.getBoundingClientRect());
		};
		computeWidth();
		const ob = new MutationObserver(computeWidth);
		ob.observe(document.body, { childList: true, subtree: true });
		window.addEventListener("resize", computeWidth);
		computeWidth();
		return () => {
			ob.disconnect();
			window.removeEventListener("resize", computeWidth);
		};
	}, [codeEditor]);

	return (
		<>
			<ViewportToaster position="bottom-right" />
			<div
				className="hover:opacity-25 transition-opacity absolute top-4 right-4 w-56 px-4 py-2 rounded-lg bg-black text-white font-mono text-sm shadow-xl"
				style={{ right: -(codeEditorRect?.width - 16) }}
			>
				<div
					className={cn("text-2xl font-bold", {
						hidden: !shockIntervalSeconds,
						"text-blue-500": !isSuccessful && !hasFocusedCodeEditor,
						"text-yellow-500":
							hasFocusedCodeEditor && !isSuccessful && count > 15,
						"text-red-500":
							hasFocusedCodeEditor && !isSuccessful && count <= 15,
						"text-green-500": isSuccessful,
					})}
				>
					{remainingMinutes}:{remainingSeconds.toString().padStart(2, "0")}
				</div>
				<div>
					<span className="text-xs">Intensity:</span>
					<div className="flex items-center gap-2 text-lg">
						<span className="shrink-0">{intensity}%</span>
						<div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-red-500 overflow-hidden flex justify-end">
							<div
								className="h-full bg-white"
								style={{ width: `${100 - intensity}%` }}
							/>
						</div>
					</div>
				</div>
				<div>
					<span className="text-xs">Duration:</span>
					<div className="flex items-center gap-2 text-lg">
						<span className="shrink-0">{duration}s</span>
					</div>
				</div>
			</div>
		</>
	);
}

function ShockerOverlayWithSuspense() {
	return (
		<Suspense fallback={null}>
			<ShockerOverlay />
		</Suspense>
	);
}

export default ShockerOverlayWithSuspense;
