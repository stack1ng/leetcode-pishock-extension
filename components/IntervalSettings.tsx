import type { Settings } from "~lib/settings"

interface Props {
	settings: Settings
	updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const inputClasses =
	"w-full rounded-lg border border-white/10 px-3 py-2 text-sm bg-black/30 text-zinc-200 transition-all focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-zinc-600"

export default function IntervalSettings({ settings, updateSetting }: Props) {
	return (
		<fieldset className="border border-white/10 rounded-xl px-4 pt-3 pb-4 m-0 bg-white/[0.02]">
			<legend className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
				Timed Shock Interval
			</legend>

			<p className="my-1.5 mb-3 text-[11px] text-zinc-500 leading-relaxed">
				Shocks you at regular intervals while coding. Intensity and duration
				increase with each shock until you solve the problem!
			</p>

			<div className="grid grid-cols-2 gap-x-3 gap-y-2">
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">
						Interval (seconds)
					</span>
					<input
						type="number"
						min="10"
						max="600"
						value={settings.shockIntervalSeconds}
						onChange={(e) =>
							updateSetting("shockIntervalSeconds", Number(e.target.value))
						}
						placeholder="120"
						className={inputClasses}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">
						Intensity step (+)
					</span>
					<input
						type="number"
						min="0"
						max="25"
						value={settings.incrementalIntensityStep}
						onChange={(e) =>
							updateSetting("incrementalIntensityStep", Number(e.target.value))
						}
						placeholder="5"
						className={inputClasses}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">
						Duration step (s)
					</span>
					<input
						type="number"
						min="0"
						max="2"
						step="0.1"
						value={settings.incrementalDurationStep}
						onChange={(e) =>
							updateSetting("incrementalDurationStep", Number(e.target.value))
						}
						placeholder="0.5"
						className={inputClasses}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">
						Max intensity
					</span>
					<input
						type="number"
						min="1"
						max="100"
						value={settings.maxIntensity}
						onChange={(e) =>
							updateSetting("maxIntensity", Number(e.target.value))
						}
						placeholder="100"
						className={inputClasses}
					/>
				</label>
				<label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
					<span className="text-xs text-zinc-400 font-medium">
						Max duration (s)
					</span>
					<input
						type="number"
						min="0.1"
						max="15"
						step="0.1"
						value={settings.maxDuration}
						onChange={(e) =>
							updateSetting("maxDuration", Number(e.target.value))
						}
						placeholder="5"
						className={inputClasses}
					/>
				</label>
			</div>
		</fieldset>
	)
}

