import { useSyncExternalStore } from "react";
import { Settings, DEFAULT_SETTINGS } from "../../types/settings";

// Global state for suspense
let settingsCache: Settings | null = null;
let settingsPromise: Promise<Settings> | null = null;

function loadSettings(): Promise<Settings> {
	if (!settingsPromise) {
		settingsPromise = browser.storage.local
			.get(DEFAULT_SETTINGS)
			.then((stored) => {
				settingsCache = { ...DEFAULT_SETTINGS, ...stored };
				return settingsCache;
			});
	}
	return settingsPromise;
}

// Listeners for settings changes
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
	listeners.add(callback);
	return () => listeners.delete(callback);
}

function getSnapshot(): Settings {
	if (!settingsCache) {
		throw loadSettings();
	}
	return settingsCache;
}

// Listen for storage changes and update cache
browser.storage.onChanged.addListener((changes, area) => {
	if (area !== "local" || !settingsCache) return;

	let hasChanges = false;
	const updated = { ...settingsCache };

	for (const key of Object.keys(changes)) {
		if (key in updated) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(updated as any)[key] = changes[key].newValue;
			hasChanges = true;
		}
	}

	if (hasChanges) {
		settingsCache = updated;
		listeners.forEach((listener) => listener());
	}
});

/**
 * React hook to access extension settings.
 * Suspends until settings are loaded.
 * Automatically syncs when settings change in storage.
 */
export function useSettings(): Settings {
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
