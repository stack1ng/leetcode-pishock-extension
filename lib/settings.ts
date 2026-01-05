export interface Settings {
	pishockUsername: string
	pishockApiKey: string
	pishockCode: string
	pishockClientId: string
	pishockShockerId: string
	shockOnTestFail: boolean
	shockOnFinalFail: boolean
	initialShockIntensity: number
	initialShockDuration: number
	vibrateIntensity: number
	vibrateDuration: number
	shockIntervalSeconds: number
	incrementalIntensityStep: number
	incrementalDurationStep: number
	maxIntensity: number
	maxDuration: number
}

export const DEFAULT_SETTINGS: Settings = {
	pishockUsername: "",
	pishockApiKey: "",
	pishockCode: "",
	pishockClientId: "",
	pishockShockerId: "",
	shockOnTestFail: false,
	shockOnFinalFail: false,
	initialShockIntensity: 30,
	initialShockDuration: 1,
	vibrateIntensity: 25,
	vibrateDuration: 1,
	shockIntervalSeconds: 120,
	incrementalIntensityStep: 5,
	incrementalDurationStep: 0.5,
	maxIntensity: 100,
	maxDuration: 5,
}

export type SubmissionEvent = {
	kind: "final" | "test"
	success: boolean
}

export type ShockCommand = {
	action: "shock" | "vibrate"
	intensity: number // 1-100
	duration: number // seconds
}

// Messages FROM content/popup TO background
export type BackgroundMessage =
	| { type: "shock"; payload: ShockCommand }
	| { type: "testVibrate" }

// Messages FROM background TO content
export type ContentMessage = { type: "submission"; payload: SubmissionEvent }

