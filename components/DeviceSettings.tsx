import type { Settings } from "~lib/settings"

interface Props {
	settings: Settings
	updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const inputClasses =
	"w-full rounded-lg border border-white/10 px-3 py-2 text-sm bg-black/30 text-zinc-200 transition-all focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-zinc-600"

export default function DeviceSettings({ settings, updateSetting }: Props) {
	return (
		<fieldset className="border border-white/10 rounded-xl px-4 pt-3 pb-4 m-0 bg-white/[0.02]">
			<legend className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
				Device Connection
			</legend>

			<label className="flex flex-col gap-1 mt-2">
				<span className="text-xs text-zinc-400 font-medium">
					PiShock Username
				</span>
				<input
					type="text"
					value={settings.pishockUsername}
					onChange={(e) => updateSetting("pishockUsername", e.target.value)}
					autoComplete="off"
					required
					className={inputClasses}
				/>
			</label>

			<label className="flex flex-col gap-1 mt-2">
				<span className="text-xs text-zinc-400 font-medium">
					PiShock API Key
				</span>
				<input
					type="password"
					value={settings.pishockApiKey}
					onChange={(e) => updateSetting("pishockApiKey", e.target.value)}
					autoComplete="off"
					required
					className={inputClasses}
				/>
			</label>

			<label className="flex flex-col gap-1 mt-2">
				<span className="text-xs text-zinc-400 font-medium">
					Device Share Code
				</span>
				<input
					type="text"
					value={settings.pishockCode}
					onChange={(e) => updateSetting("pishockCode", e.target.value)}
					autoComplete="off"
					required
					className={inputClasses}
				/>
			</label>

			<div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-2">
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">Client ID</span>
					<input
						type="text"
						value={settings.pishockClientId}
						onChange={(e) => updateSetting("pishockClientId", e.target.value)}
						autoComplete="off"
						placeholder="e.g. 20512"
						required
						className={inputClasses}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-zinc-400 font-medium">Shocker ID</span>
					<input
						type="text"
						value={settings.pishockShockerId}
						onChange={(e) => updateSetting("pishockShockerId", e.target.value)}
						autoComplete="off"
						placeholder="e.g. 12345"
						required
						className={inputClasses}
					/>
				</label>
			</div>
		</fieldset>
	)
}

