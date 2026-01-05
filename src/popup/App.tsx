import { useState, useEffect } from "react";
import DeviceSettings from "./components/DeviceSettings";
import ShockTriggers from "./components/ShockTriggers";
import IntensitySettings from "./components/IntensitySettings";
import IntervalSettings from "./components/IntervalSettings";
import { Settings, DEFAULT_SETTINGS } from "../types/settings";

function clamp(num: number, min: number, max: number): number {
	if (!Number.isFinite(num)) return min;
	return Math.max(min, Math.min(max, num));
}

export default function App() {
	const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
	const [status, setStatus] = useState<{ message: string; type: string }>({
		message: "",
		type: "",
	});

	useEffect(() => {
		browser.storage.local
			.get(DEFAULT_SETTINGS)
			.then((stored) => {
				setSettings({ ...DEFAULT_SETTINGS, ...stored });
			})
			.catch((err) => {
				console.error("Failed to load settings:", err);
				setStatus({ message: "Failed to load settings.", type: "error" });
			});
	}, []);

	const updateSetting = <K extends keyof Settings>(
		key: K,
		value: Settings[K]
	) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const {
			pishockUsername,
			pishockApiKey,
			pishockCode,
			pishockClientId,
			pishockShockerId,
		} = settings;

		if (
			!pishockUsername ||
			!pishockApiKey ||
			!pishockCode ||
			!pishockClientId ||
			!pishockShockerId
		) {
			setStatus({
				message: "Please fill in all PiShock fields.",
				type: "error",
			});
			return;
		}

		const toSave: Settings = {
			...settings,
			initialShockIntensity: clamp(settings.initialShockIntensity, 1, 100),
			initialShockDuration: clamp(settings.initialShockDuration, 0.1, 15),
			vibrateIntensity: clamp(settings.vibrateIntensity, 1, 100),
			vibrateDuration: clamp(settings.vibrateDuration, 0.1, 15),
			shockIntervalSeconds: clamp(settings.shockIntervalSeconds, 10, 600),
			incrementalIntensityStep: clamp(settings.incrementalIntensityStep, 0, 25),
			incrementalDurationStep: clamp(settings.incrementalDurationStep, 0, 2),
			maxIntensity: clamp(settings.maxIntensity, 1, 100),
			maxDuration: clamp(settings.maxDuration, 0.1, 15),
		};

		browser.storage.local
			.set(toSave)
			.then(() => {
				setStatus({ message: "Settings saved!", type: "success" });
				setTimeout(() => setStatus({ message: "", type: "" }), 2000);
			})
			.catch((err) => {
				console.error("Failed to save settings:", err);
				setStatus({ message: "Failed to save settings.", type: "error" });
			});
	};

	const handleTestVibrate = () => {
		browser.runtime
			.sendMessage({ type: "testVibrate" })
			.then(() => {
				setStatus({ message: "Test vibrate sent!", type: "success" });
				setTimeout(() => setStatus({ message: "", type: "" }), 2000);
			})
			.catch((err) => {
				console.error("Failed to send test vibrate:", err);
				setStatus({ message: "Failed to send test vibrate.", type: "error" });
			});
	};

	return (
		<div
			className="max-w-md mx-auto mt-8 bg-gradient-to-br from-zinc-950 to-zinc-900 text-zinc-200 p-4 pb-5 font-sans rounded-xl shadow-2xl"
			data-tab-view
		>
			<h1 className="m-0 mb-4 text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
				<span className="text-amber-400">⚡</span>
				LeetCode PiShock
			</h1>

			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<DeviceSettings settings={settings} updateSetting={updateSetting} />
				<ShockTriggers settings={settings} updateSetting={updateSetting} />
				<IntensitySettings settings={settings} updateSetting={updateSetting} />
				<IntervalSettings settings={settings} updateSetting={updateSetting} />

				<div className="flex justify-end gap-2.5 mt-2">
					<button
						type="button"
						onClick={handleTestVibrate}
						className="rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
					>
						Test Vibrate
					</button>
					<button
						type="submit"
						className="rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30"
					>
						Save Settings
					</button>
				</div>

				{status.message && (
					<div
						className={`min-h-[18px] mt-2 text-xs text-center ${
							status.type === "error"
								? "text-red-400"
								: status.type === "success"
								? "text-green-400"
								: "text-violet-400"
						}`}
					>
						{status.message}
					</div>
				)}
			</form>
		</div>
	);
}
