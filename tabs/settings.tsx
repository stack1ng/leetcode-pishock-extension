import { useState, useEffect } from "react";
import { Storage } from "@plasmohq/storage";

import "~styles/popup.css";
import DeviceSettings from "~components/DeviceSettings";
import ShockTriggers from "~components/ShockTriggers";
import IntensitySettings from "~components/IntensitySettings";
import IntervalSettings from "~components/IntervalSettings";
import { DEFAULT_SETTINGS, type Settings } from "~lib/settings";

const storage = new Storage();

function clamp(num: number, min: number, max: number): number {
	if (!Number.isFinite(num)) return min;
	return Math.max(min, Math.min(max, num));
}

function SettingsPage() {
	const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
	const [status, setStatus] = useState<{ message: string; type: string }>({
		message: "",
		type: "",
	});

	useEffect(() => {
		async function loadSettings() {
			try {
				const stored: Partial<Settings> = {};
				for (const key of Object.keys(DEFAULT_SETTINGS)) {
					const value = await storage.get(key);
					if (value !== undefined) {
						stored[key as keyof Settings] = value;
					}
				}
				setSettings({ ...DEFAULT_SETTINGS, ...stored });
			} catch (err) {
				console.error("Failed to load settings:", err);
				setStatus({ message: "Failed to load settings.", type: "error" });
			}
		}
		loadSettings();
	}, []);

	const updateSetting = <K extends keyof Settings>(
		key: K,
		value: Settings[K]
	) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
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
			shockIntervalSeconds:
				settings.shockIntervalSeconds !== undefined
					? clamp(settings.shockIntervalSeconds, 10, Infinity)
					: undefined,
			incrementalIntensityStep: clamp(settings.incrementalIntensityStep, 0, 25),
			incrementalDurationStep: clamp(settings.incrementalDurationStep, 0, 2),
			maxIntensity: clamp(settings.maxIntensity, 1, 100),
			maxDuration: clamp(settings.maxDuration, 0.1, 15),
		};

		try {
			for (const [key, value] of Object.entries(toSave)) {
				if (value === undefined) {
					await storage.remove(key);
				} else {
					await storage.set(key, value);
				}
			}
			setStatus({ message: "Settings saved!", type: "success" });
			setTimeout(() => setStatus({ message: "", type: "" }), 2000);
		} catch (err) {
			console.error("Failed to save settings:", err);
			setStatus({ message: "Failed to save settings.", type: "error" });
		}
	};

	const handleTestVibrate = async () => {
		try {
			await chrome.runtime.sendMessage({
				type: "vibrate",
				payload: {
					action: "vibrate",
					intensity: settings.vibrateIntensity,
					duration: settings.vibrateDuration,
				},
			});
			setStatus({ message: "Test vibrate sent!", type: "success" });
			setTimeout(() => setStatus({ message: "", type: "" }), 2000);
		} catch (err) {
			console.error("Failed to send test vibrate:", err);
			setStatus({ message: "Failed to send test vibrate.", type: "error" });
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-start justify-center pt-12 pb-12">
			<div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-sm text-zinc-200 p-6 font-sans rounded-2xl shadow-2xl border border-white/5">
				<h1 className="m-0 mb-6 text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
					<span className="text-amber-400 text-3xl">⚡</span>
					LeetCode PiShock
				</h1>

				<form onSubmit={handleSubmit} className="flex flex-col gap-5">
					<DeviceSettings settings={settings} updateSetting={updateSetting} />
					<ShockTriggers settings={settings} updateSetting={updateSetting} />
					<IntensitySettings
						settings={settings}
						updateSetting={updateSetting}
					/>
					<IntervalSettings settings={settings} updateSetting={updateSetting} />

					<div className="flex justify-end gap-3 mt-3">
						<button
							type="button"
							onClick={handleTestVibrate}
							className="rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border border-white/10"
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
							className={`min-h-[18px] mt-2 text-sm text-center font-medium ${
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
		</div>
	);
}

export default SettingsPage;
