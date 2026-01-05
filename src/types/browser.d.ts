/* eslint-disable @typescript-eslint/no-explicit-any */
// Browser extension API types
declare const browser: {
	storage: {
		local: {
			get: <T>(defaults: T) => Promise<T>;
			set: (values: any) => Promise<void>;
		};
		onChanged: {
			addListener: (
				callback: (
					changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
					area: string
				) => void
			) => void;
			removeListener: (
				callback: (
					changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
					area: string
				) => void
			) => void;
		};
	};
	runtime: {
		sendMessage: <T = unknown>(message: unknown) => Promise<T>;
		onMessage: {
			addListener: (
				callback: (
					message: unknown,
					sender: { tab?: { id?: number } }
				) => void | Promise<unknown>
			) => void;
			removeListener: (callback: (message: unknown) => void) => void;
		};
	};
	tabs: {
		sendMessage: (tabId: number, message: unknown) => Promise<void>;
		onRemoved: {
			addListener: (callback: (tabId: number) => void) => void;
		};
	};
	webRequest: {
		onBeforeRequest: {
			addListener: (
				callback: (details: {
					requestId: string;
					tabId: number;
				}) => Record<string, never>,
				filter: { urls: string[] },
				extraInfoSpec: string[]
			) => void;
		};
		filterResponseData: (requestId: string) => {
			ondata: ((event: { data: ArrayBuffer }) => void) | null;
			onstop: (() => void) | null;
			write: (data: ArrayBuffer) => void;
			close: () => void;
		};
	};
};
