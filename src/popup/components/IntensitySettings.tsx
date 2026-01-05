import { Settings } from "../../types/settings";

interface Props {
	settings: Settings;
	updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const inputClasses =
	"rounded-lg border border-white/10 px-3 py-2 text-sm bg-black/30 text-zinc-200 transition-all focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-zinc-600";

export default function IntensitySettings({ settings, updateSetting }: Props) {
	return (
		<fieldset className="border border-white/8 rounded-xl px-4 pt-3 pb-4 m-0 bg-white/2">
			<legend className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
				Intensity & Duration
			</legend>

			<div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-1">
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">
						Initial shock intensity (1–100)
					</span>
					<input
						type="number"
						min="1"
						max="100"
						value={settings.initialShockIntensity}
						onChange={(e) =>
							updateSetting("initialShockIntensity", Number(e.target.value))
						}
						className={inputClasses}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">
						Initial shock duration (s)
					</span>
					<input
						type="number"
						min="0.1"
						max="15"
						step="0.1"
						value={settings.initialShockDuration}
						onChange={(e) =>
							updateSetting("initialShockDuration", Number(e.target.value))
						}
						className={inputClasses}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">
						Vibrate intensity (1–100)
					</span>
					<input
						type="number"
						min="1"
						max="100"
						value={settings.vibrateIntensity}
						onChange={(e) =>
							updateSetting("vibrateIntensity", Number(e.target.value))
						}
						className={inputClasses}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">
						Vibrate duration (s)
					</span>
					<input
						type="number"
						min="0.1"
						max="15"
						step="0.1"
						value={settings.vibrateDuration}
						onChange={(e) =>
							updateSetting("vibrateDuration", Number(e.target.value))
						}
						className={inputClasses}
					/>
				</label>
			</div>
		</fieldset>
	);
}
