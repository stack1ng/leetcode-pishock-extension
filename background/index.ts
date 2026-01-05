import { Storage } from "@plasmohq/storage"

import {
	DEFAULT_SETTINGS,
	type BackgroundMessage,
	type ContentMessage,
	type Settings,
	type ShockCommand,
	type SubmissionEvent,
} from "~lib/settings"

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const storage = new Storage()
let settings: Settings = { ...DEFAULT_SETTINGS }
const seenSubmissions = new Set<string>()

let ws: WebSocket | null = null
let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null
let wsPingInterval: ReturnType<typeof setInterval> | null = null
const WS_PING_INTERVAL_MS = 30000
const WS_RECONNECT_DELAY_MS = 5000

// ─────────────────────────────────────────────────────────────────────────────
// Extension Icon Click - Open settings in new tab
// ─────────────────────────────────────────────────────────────────────────────

chrome.action.onClicked.addListener(() => {
	chrome.tabs.create({ url: chrome.runtime.getURL("tabs/settings.html") })
})

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

async function loadSettings(): Promise<void> {
	try {
		const stored: Partial<Settings> = {}
		for (const key of Object.keys(DEFAULT_SETTINGS)) {
			const value = await storage.get(key)
			if (value !== undefined) {
				stored[key as keyof Settings] = value
			}
		}
		settings = { ...DEFAULT_SETTINGS, ...stored }
		connectWebSocket()
	} catch (err) {
		console.error("PiShock: failed to load settings", err)
	}
}

loadSettings()

// Watch for settings changes
storage.watch({
	pishockUsername: () => {
		loadSettings()
	},
	pishockApiKey: () => {
		disconnectWebSocket()
		loadSettings()
	},
})

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket
// ─────────────────────────────────────────────────────────────────────────────

function connectWebSocket(): void {
	const { pishockUsername, pishockApiKey } = settings
	if (!pishockUsername || !pishockApiKey) {
		console.log("PiShock: credentials not configured")
		return
	}

	if (
		ws &&
		(ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
	)
		return

	const wsUrl = `wss://broker.pishock.com/v2?Username=${encodeURIComponent(
		pishockUsername
	)}&ApiKey=${encodeURIComponent(pishockApiKey)}`

	try {
		ws = new WebSocket(wsUrl)
		ws.onopen = () => {
			console.log("PiShock: WebSocket connected")
			startPingInterval()
		}
		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data)
				if (data.IsError)
					console.error("PiShock: WebSocket error", data.Message)
			} catch {
				// Ignore non-JSON
			}
		}
		ws.onerror = (error) => console.error("PiShock: WebSocket error", error)
		ws.onclose = () => {
			console.log("PiShock: WebSocket closed, reconnecting...")
			stopPingInterval()
			scheduleReconnect()
		}
	} catch (err) {
		console.error("PiShock: WebSocket creation failed", err)
		scheduleReconnect()
	}
}

function disconnectWebSocket(): void {
	stopPingInterval()
	if (wsReconnectTimeout) {
		clearTimeout(wsReconnectTimeout)
		wsReconnectTimeout = null
	}
	if (ws) {
		ws.onclose = null
		ws.close()
		ws = null
	}
}

function scheduleReconnect(): void {
	if (wsReconnectTimeout) return
	wsReconnectTimeout = setTimeout(() => {
		wsReconnectTimeout = null
		connectWebSocket()
	}, WS_RECONNECT_DELAY_MS)
}

function startPingInterval(): void {
	stopPingInterval()
	wsPingInterval = setInterval(() => {
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ Operation: "PING" }))
		}
	}, WS_PING_INTERVAL_MS)
}

function stopPingInterval(): void {
	if (wsPingInterval) {
		clearInterval(wsPingInterval)
		wsPingInterval = null
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PiShock Command
// ─────────────────────────────────────────────────────────────────────────────

async function sendPiShock(command: ShockCommand): Promise<void> {
	// Reload settings to ensure we have the latest
	await loadSettings()

	const { pishockCode, pishockClientId, pishockShockerId } = settings

	if (!pishockCode || !pishockClientId || !pishockShockerId) {
		console.warn("PiShock: device not configured")
		return
	}

	if (!ws || ws.readyState !== WebSocket.OPEN) {
		console.warn("PiShock: WebSocket not connected, reconnecting...")
		connectWebSocket()
		return
	}

	const mode = command.action === "shock" ? "s" : "v"
	const durationMs = command.duration * 1000

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
	}

	try {
		ws.send(JSON.stringify(wsCommand))
		console.log(`PiShock: sent ${command.action}`, command)
	} catch (err) {
		console.error("PiShock: send failed", err)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Notify content script
// ─────────────────────────────────────────────────────────────────────────────

function notifyTab(tabId: number, message: ContentMessage): void {
	chrome.tabs.sendMessage(tabId, message).catch(() => {})
}

// ─────────────────────────────────────────────────────────────────────────────
// Message handling
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
	const msg = message as BackgroundMessage & { type: string; data?: unknown }

	switch (msg.type) {
		case "shock":
			sendPiShock((msg as BackgroundMessage & { type: "shock" }).payload)
			break

		case "testVibrate":
			loadSettings().then(() => {
				sendPiShock({
					action: "vibrate",
					intensity: settings.vibrateIntensity,
					duration: settings.vibrateDuration,
				})
			})
			break

		case "submissionResult":
			// Handle submission result from content script
			if (sender.tab?.id) {
				handleSubmissionResult(msg.data as LeetCodeResponse, sender.tab.id)
			}
			break
	}
})

// ─────────────────────────────────────────────────────────────────────────────
// LeetCode submission monitoring
// ─────────────────────────────────────────────────────────────────────────────

interface LeetCodeResponse {
	state?: string
	task_name?: string
	submission_id?: string
	submissionId?: string
	task_finish_time?: string
	run_success?: boolean
}

function handleSubmissionResult(data: LeetCodeResponse, tabId: number): void {
	if (!data || typeof data !== "object") return
	if (data.state && data.state !== "SUCCESS") return

	const taskName = data.task_name
	const isTest = taskName === "judger.runcodetask.RunCode"
	const isFinal = taskName === "judger.judgetask.Judge"

	if (!isTest && !isFinal) return

	const submissionId =
		data.submission_id ||
		data.submissionId ||
		`${taskName}:${data.task_finish_time || Date.now()}`

	if (seenSubmissions.has(submissionId)) return
	seenSubmissions.add(submissionId)

	const event: SubmissionEvent = {
		kind: isFinal ? "final" : "test",
		success: Boolean(data.run_success),
	}

	notifyTab(tabId, { type: "submission", payload: event })
	console.log("PiShock: submission", event)
}

// ─────────────────────────────────────────────────────────────────────────────
// Firefox-specific: Web Request Interception (MV3)
// Chrome MV3 uses content script fetch interception instead
// ─────────────────────────────────────────────────────────────────────────────

// Define Firefox-specific webRequest types
interface FilterResponseData {
	ondata: ((event: { data: ArrayBuffer }) => void) | null
	onstop: (() => void) | null
	write: (data: ArrayBuffer) => void
	close: () => void
}

interface FirefoxWebRequest {
	filterResponseData: (requestId: string) => FilterResponseData
	onBeforeRequest: {
		addListener: (
			callback: (details: { requestId: string; tabId: number }) => object,
			filter: { urls: string[] },
			extraInfoSpec: string[]
		) => void
	}
}

// Check if we're in Firefox (has filterResponseData)
function isFirefox(): boolean {
	try {
		return (
			typeof browser !== "undefined" &&
			typeof (browser as unknown as { webRequest?: FirefoxWebRequest })
				.webRequest?.filterResponseData === "function"
		)
	} catch {
		return false
	}
}

if (isFirefox()) {
	const browserApi = browser as unknown as {
		webRequest: FirefoxWebRequest
	}

	browserApi.webRequest.onBeforeRequest.addListener(
		(details) => {
			const tabId = details.tabId

			try {
				const filter = browserApi.webRequest.filterResponseData(
					details.requestId
				)
				const decoder = new TextDecoder("utf-8")
				let body = ""

				filter.ondata = (event) => {
					try {
						body += decoder.decode(event.data, { stream: true })
					} catch (err) {
						console.error("PiShock: decode error", err)
					}
					filter.write(event.data)
				}

				filter.onstop = () => {
					try {
						body += decoder.decode()
						if (body) {
							const json = JSON.parse(body) as LeetCodeResponse
							handleSubmissionResult(json, tabId)
						}
					} catch {
						// Not JSON
					}
					filter.close()
				}
			} catch (err) {
				console.error("PiShock: filter error", err)
			}

			return {}
		},
		{ urls: ["https://leetcode.com/submissions/detail/*/check/"] },
		["blocking"]
	)
}

export {}
