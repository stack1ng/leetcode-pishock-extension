import type {
	SubmissionEvent,
	BackgroundMessage,
	ContentMessage,
	ShockCommand,
} from "../types/events";
import { Settings, DEFAULT_SETTINGS } from "../types/settings";

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

let settings: Settings = { ...DEFAULT_SETTINGS };
const seenSubmissions = new Set<string>();

let ws: WebSocket | null = null;
let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let wsPingInterval: ReturnType<typeof setInterval> | null = null;
const WS_PING_INTERVAL_MS = 30000;
const WS_RECONNECT_DELAY_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

function loadSettings(): Promise<void> {
	return browser.storage.local
		.get(DEFAULT_SETTINGS)
		.then((stored) => {
			settings = { ...DEFAULT_SETTINGS, ...stored };
			connectWebSocket();
		})
		.catch((err) => console.error("PiShock: failed to load settings", err));
}

loadSettings();

// Open settings in a new tab when clicking the extension icon
browser.browserAction.onClicked.addListener(() => {
	browser.tabs.create({ url: browser.runtime.getURL("popup.html?tab=1") });
});

browser.storage.onChanged.addListener((changes, area) => {
	if (area !== "local") return;

	const credentialsChanged =
		"pishockUsername" in changes || "pishockApiKey" in changes;

	Object.keys(changes).forEach((key) => {
		if (key in settings) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(settings as any)[key] = changes[key].newValue;
		}
	});

	if (credentialsChanged) {
		disconnectWebSocket();
		connectWebSocket();
	}
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

function sendPiShock(command: ShockCommand): void {
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
	browser.tabs.sendMessage(tabId, message).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Message handling
// ─────────────────────────────────────────────────────────────────────────────

browser.runtime.onMessage.addListener((message: unknown) => {
	const msg = message as BackgroundMessage;

	debugger;
	switch (msg.type) {
		case "shock":
			sendPiShock(msg.payload);
			break;

		case "testVibrate":
			sendPiShock({
				action: "vibrate",
				intensity: settings.vibrateIntensity,
				duration: settings.vibrateDuration,
			});
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
	run_success?: boolean;
}

function handleSubmissionResult(data: LeetCodeResponse, tabId: number): void {
	if (!data || typeof data !== "object") return;
	if (data.state && data.state !== "SUCCESS") return;

	const taskName = data.task_name;
	const isTest = taskName === "judger.runcodetask.RunCode";
	const isFinal = taskName === "judger.judgetask.Judge";

	if (!isTest && !isFinal) return;

	const submissionId =
		data.submission_id ||
		data.submissionId ||
		`${taskName}:${data.task_finish_time || Date.now()}`;

	if (seenSubmissions.has(submissionId)) return;
	seenSubmissions.add(submissionId);

	const event: SubmissionEvent = {
		kind: isFinal ? "final" : "test",
		success: Boolean(data.run_success),
	};

	notifyTab(tabId, { type: "submission", payload: event });
	console.log("PiShock: submission", event);
}

browser.webRequest.onBeforeRequest.addListener(
	(details) => {
		const tabId = details.tabId;

		try {
			const filter = browser.webRequest.filterResponseData(details.requestId);
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
	{ urls: ["https://leetcode.com/submissions/detail/*/check/"] },
	["blocking"]
);
