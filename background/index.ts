import { Storage } from "@plasmohq/storage";

import {
	DEFAULT_SETTINGS,
	type BackgroundMessage,
	type ContentMessage,
	type Settings,
	type ShockCommand,
	type SubmissionEvent,
} from "~lib/settings";

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const storage = new Storage();
let settings: Settings = { ...DEFAULT_SETTINGS };
const seenSubmissions = new Set<string>();

let ws: WebSocket | null = null;
let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let wsPingInterval: ReturnType<typeof setInterval> | null = null;
const WS_PING_INTERVAL_MS = 30000;
const WS_RECONNECT_DELAY_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Extension Icon Click - Open settings in new tab
// ─────────────────────────────────────────────────────────────────────────────

chrome.action.onClicked.addListener(() => {
	chrome.tabs.create({ url: chrome.runtime.getURL("tabs/settings.html") });
});

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

async function loadSettings(): Promise<void> {
	try {
		const stored: Partial<Settings> = {};
		for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
			const value = await storage.get(key);
			if (value !== undefined) {
				(stored as Record<keyof Settings, unknown>)[key] = value;
			}
		}
		settings = { ...DEFAULT_SETTINGS, ...stored };
		connectWebSocket();
	} catch (err) {
		console.error("PiShock: failed to load settings", err);
	}
}

loadSettings();

// Watch for settings changes
storage.watch({
	pishockUsername: () => {
		loadSettings();
	},
	pishockApiKey: () => {
		disconnectWebSocket();
		loadSettings();
	},
});

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket
// ─────────────────────────────────────────────────────────────────────────────

function connectWebSocket(): void {
	const { pishockUsername, pishockApiKey } = settings;
	if (!pishockUsername || !pishockApiKey) {
		console.log("PiShock: credentials not configured");
		return;
	}

	if (
		ws &&
		(ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
	)
		return;

	const wsUrl = `wss://broker.pishock.com/v2?Username=${encodeURIComponent(
		pishockUsername
	)}&ApiKey=${encodeURIComponent(pishockApiKey)}`;

	try {
		ws = new WebSocket(wsUrl);
		ws.onopen = () => {
			console.log("PiShock: WebSocket connected");
			startPingInterval();
		};
		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.IsError)
					console.error("PiShock: WebSocket error", data.Message);
			} catch {
				// Ignore non-JSON
			}
		};
		ws.onerror = (error) => console.error("PiShock: WebSocket error", error);
		ws.onclose = () => {
			console.log("PiShock: WebSocket closed, reconnecting...");
			stopPingInterval();
			scheduleReconnect();
		};
	} catch (err) {
		console.error("PiShock: WebSocket creation failed", err);
		scheduleReconnect();
	}
}

function disconnectWebSocket(): void {
	stopPingInterval();
	if (wsReconnectTimeout) {
		clearTimeout(wsReconnectTimeout);
		wsReconnectTimeout = null;
	}
	if (ws) {
		ws.onclose = null;
		ws.close();
		ws = null;
	}
}

function scheduleReconnect(): void {
	if (wsReconnectTimeout) return;
	wsReconnectTimeout = setTimeout(() => {
		wsReconnectTimeout = null;
		connectWebSocket();
	}, WS_RECONNECT_DELAY_MS);
}

function startPingInterval(): void {
	stopPingInterval();
	wsPingInterval = setInterval(() => {
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ Operation: "PING" }));
		}
	}, WS_PING_INTERVAL_MS);
}

function stopPingInterval(): void {
	if (wsPingInterval) {
		clearInterval(wsPingInterval);
		wsPingInterval = null;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PiShock Command
// ─────────────────────────────────────────────────────────────────────────────

async function sendPiShock(command: ShockCommand): Promise<void> {
	// Reload settings to ensure we have the latest
	await loadSettings();

	const { pishockCode, pishockClientId, pishockShockerId } = settings;

	if (!pishockCode || !pishockClientId || !pishockShockerId) {
		console.warn("PiShock: device not configured");
		return;
	}

	if (!ws || ws.readyState !== WebSocket.OPEN) {
		console.warn("PiShock: WebSocket not connected, reconnecting...");
		connectWebSocket();
		return;
	}

	const mode = command.action === "shock" ? "s" : "v";
	const durationMs = command.duration * 1000;

	const wsCommand = {
		Operation: "PUBLISH",
		PublishCommands: [
			{
				Target: `c${pishockClientId}-sops-${pishockCode}`,
				Body: {
					id: +pishockShockerId,
					m: mode,
					i: command.intensity,
					d: durationMs,
					r: true,
					l: { ty: "sc", w: false, h: false, o: "leetcode-pishock" },
				},
			},
		],
	};

	try {
		ws.send(JSON.stringify(wsCommand));
		console.log(`PiShock: sent ${command.action}`, command);
	} catch (err) {
		console.error("PiShock: send failed", err);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Notify content script
// ─────────────────────────────────────────────────────────────────────────────

function notifyTab(tabId: number, message: ContentMessage): void {
	chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Message handling
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown) => {
	const msg = message as BackgroundMessage & { type: string };

	switch (msg.type) {
		case "shock":
			sendPiShock((msg as BackgroundMessage & { type: "shock" }).payload);
			break;

		case "vibrate":
			sendPiShock((msg as BackgroundMessage & { type: "vibrate" }).payload);
			break;
	}
});

// ─────────────────────────────────────────────────────────────────────────────
// LeetCode submission monitoring
// ─────────────────────────────────────────────────────────────────────────────

interface LeetCodeResponse {
	state?: string;
	task_name?: string;
	submission_id?: string;
	submissionId?: string;
	task_finish_time?: string;
	status_msg?: string;
	run_success?: boolean;
	correct_answer?: boolean;
}

function handleSubmissionResult(data: LeetCodeResponse, tabId: number): void {
	if (!data || typeof data !== "object") return;
	if (data.state && data.state !== "SUCCESS") return;

	const taskName = data.task_name;
	let isTest = false;
	let isFinal = false;
	let success = false;
	switch (taskName) {
		case "judger.runcodetask.RunCode":
			isTest = true;
			success = data.correct_answer === true;
			break;
		case "judger.judgetask.Judge":
			isFinal = true;
			success = data.status_msg === "Accepted";
			break;
	}

	if (!isTest && !isFinal) return;

	const submissionId =
		data.submission_id ||
		data.submissionId ||
		`${taskName}:${data.task_finish_time || Date.now()}`;

	if (seenSubmissions.has(submissionId)) return;
	seenSubmissions.add(submissionId);

	const event: SubmissionEvent = {
		kind: isFinal ? "final" : "test",
		success,
	};

	notifyTab(tabId, { type: "submission", payload: event });
	console.log("PiShock: submission", event);
}

// ─────────────────────────────────────────────────────────────────────────────
// Web Request Interception (MV3)
// ─────────────────────────────────────────────────────────────────────────────

// Firefox-specific types for filterResponseData
interface FilterResponseData {
	ondata: ((event: { data: ArrayBuffer }) => void) | null;
	onstop: (() => void) | null;
	write: (data: ArrayBuffer) => void;
	close: () => void;
}

// Type for webRequest with Firefox's filterResponseData
type WebRequestWithFilter = typeof chrome.webRequest & {
	filterResponseData?: (requestId: string) => FilterResponseData;
};

const webRequest = chrome.webRequest as WebRequestWithFilter;

// Check if filterResponseData is available (Firefox only)
function hasFilterResponseData(): boolean {
	return typeof webRequest.filterResponseData === "function";
}

const SUBMISSION_URL_PATTERN =
	"https://leetcode.com/submissions/detail/*/check/";

if (hasFilterResponseData()) {
	// Firefox: Use filterResponseData to read response body inline
	chrome.webRequest.onBeforeRequest.addListener(
		(details) => {
			const tabId = details.tabId;

			try {
				const filter = webRequest.filterResponseData!(details.requestId);
				const decoder = new TextDecoder("utf-8");
				let body = "";

				filter.ondata = (event) => {
					try {
						body += decoder.decode(event.data, { stream: true });
					} catch (err) {
						console.error("PiShock: decode error", err);
					}
					filter.write(event.data);
				};

				filter.onstop = () => {
					try {
						body += decoder.decode();
						if (body) {
							const json = JSON.parse(body) as LeetCodeResponse;
							handleSubmissionResult(json, tabId);
						}
					} catch {
						// Not JSON
					}
					filter.close();
				};
			} catch (err) {
				console.error("PiShock: filter error", err);
			}

			return {};
		},
		{ urls: [SUBMISSION_URL_PATTERN] },
		["blocking"]
	);
} else {
	// Chrome MV3: Detect completed requests, then re-fetch from background script.
	// Background script fetches have tabId: -1, so they won't trigger this listener again.
	chrome.webRequest.onCompleted.addListener(
		async (details) => {
			// Skip requests not from a tab (e.g., our own background fetches)
			if (details.tabId < 0) return;

			try {
				// Re-fetch from background script - this won't cause infinite loop
				// because background fetches have tabId: -1 and are filtered above
				const response = await fetch(details.url, {
					credentials: "include",
				});

				if (!response.ok) {
					console.error("PiShock: fetch failed", response.status);
					return;
				}

				const json = (await response.json()) as LeetCodeResponse;
				handleSubmissionResult(json, details.tabId);
			} catch (err) {
				console.error("PiShock: fetch error", err);
			}
		},
		{ urls: [SUBMISSION_URL_PATTERN] }
	);
}

export {};
