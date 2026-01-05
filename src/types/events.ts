export type SubmissionEvent = {
	kind: "final" | "test";
	success: boolean;
};

export type ShockCommand = {
	action: "shock" | "vibrate";
	intensity: number; // 1-100
	duration: number; // seconds
};

// Messages FROM content/popup TO background
export type BackgroundMessage =
	| { type: "shock"; payload: ShockCommand }
	| { type: "testVibrate" };

// Messages FROM background TO content
export type ContentMessage = { type: "submission"; payload: SubmissionEvent };
