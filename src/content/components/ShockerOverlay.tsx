import { useCallback, useEffect, useState } from "react";
import { onSubmission, shock } from "../events";
import { useSettings } from "../hooks/useSettings";
import { useCountdown } from "usehooks-ts";
import { cn } from "../../lib/utils";
import { isInsideCodeEditor } from "../dom";
import { toast } from "sonner";

export default function ShockerOverlay() {
	const {
		shockIntervalSeconds,
		initialShockIntensity,
		initialShockDuration,
		incrementalIntensityStep,
		incrementalDurationStep,
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
		if (hasFocusedCodeEditor) startCountdown();
	}, [hasFocusedCodeEditor, startCountdown]);
	useEffect(() => {
		if (isSuccessful) stopCountdown();
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
	}, [intensity, duration, incrementalIntensityStep, incrementalDurationStep]);

	useEffect(() => {
		if (count === 0) {
			incrementalShock();
			resetCountdown();
			startCountdown();
		}
	}, [count]);

	useEffect(() => {
		const unsubscribe = onSubmission((event) => {
			console.log("Submission event:", event);
			switch (event.kind) {
				case "final":
					setIsSuccessful(event.success);
					if (!event.success) {
						incrementalShock();
					}
					break;
			}
		});

		return unsubscribe;
	}, [incrementalShock, resetCountdown]);

	const remainingMinutes = Math.floor(count / 60);
	const remainingSeconds = count % 60;

	return (
		<div className="absolute top-2 right-2 z-9999 w-56 px-4 py-2 rounded-lg bg-black text-white font-mono text-sm pointer-events-auto">
			<div
				className={cn("text-2xl font-bold", {
					"text-blue-500": !isSuccessful && !hasFocusedCodeEditor,
					"text-yellow-500":
						hasFocusedCodeEditor && !isSuccessful && count > 15,
					"text-red-500": hasFocusedCodeEditor && !isSuccessful && count <= 15,
					"text-green-500": isSuccessful,
				})}
			>
				{remainingMinutes}:{remainingSeconds.toString().padStart(2, "0")}
			</div>
			<div>
				<span className="text-xs">Intensity:</span>
				<div className="flex items-center gap-2 text-lg">
					<span className="shrink-0">{intensity}%</span>
					<div className="flex-1 h-2 bg-linear-to-r from-blue-500 to-red-500 overflow-hidden flex justify-end">
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
	);
}
