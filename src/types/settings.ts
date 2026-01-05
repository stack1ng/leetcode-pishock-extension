export interface Settings {
	pishockUsername: string;
	pishockApiKey: string;
	pishockCode: string;
	pishockClientId: string;
	pishockShockerId: string;
	shockOnTestFail: boolean;
	shockOnFinalFail: boolean;
	initialShockIntensity: number;
	initialShockDuration: number;
	vibrateIntensity: number;
	vibrateDuration: number;
	shockIntervalSeconds: number;
	incrementalIntensityStep: number;
	incrementalDurationStep: number;
	maxIntensity: number;
	maxDuration: number;
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
};

export interface TimerStatus {
	isRunning: boolean;
	isSuccess: boolean;
	intervalSeconds: number;
	secondsRemaining?: number;
	currentIntensity: number;
	maxIntensity: number;
	baseIntensity: number;
}

export type MessageType =
	| { type: "testVibrate" }
	| { type: "codingStarted" }
	| { type: "getTimerStatus" }
	| { type: "resetIncrementalState" }
	| {
			type: "timerStarted";
			intervalSeconds: number;
			currentIntensity: number;
			maxIntensity: number;
			baseIntensity: number;
	  }
	| { type: "timerStopped" }
	| { type: "timerUpdate"; status: string; secondsRemaining: number }
	| { type: "intervalReset"; intervalSeconds: number }
	| {
			type: "intensityUpdate";
			currentIntensity: number;
			maxIntensity: number;
			baseIntensity: number;
	  }
	| { type: "shockImminent"; secondsRemaining: number };
