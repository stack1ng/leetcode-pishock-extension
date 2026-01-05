import type { Settings } from "~lib/settings"

interface Props {
	settings: Settings
	updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export default function ShockTriggers({ settings, updateSetting }: Props) {
	return (
		<fieldset className="border border-white/10 rounded-xl px-4 pt-3 pb-4 m-0 bg-white/[0.02]">
			<legend className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
				Shock Triggers
			</legend>

			<label className="flex items-center gap-2.5 mt-2 text-sm cursor-pointer">
				<input
					type="checkbox"
					checked={settings.shockOnTestFail}
					onChange={(e) => updateSetting("shockOnTestFail", e.target.checked)}
					className="w-4 h-4 accent-amber-500 cursor-pointer"
				/>
				<span>Shock on failed test submissions</span>
			</label>

			<label className="flex items-center gap-2.5 mt-2 text-sm cursor-pointer">
				<input
					type="checkbox"
					checked={settings.shockOnFinalFail}
					onChange={(e) => updateSetting("shockOnFinalFail", e.target.checked)}
					className="w-4 h-4 accent-amber-500 cursor-pointer"
				/>
				<span>Shock on failed final submissions</span>
			</label>
		</fieldset>
	)
}

