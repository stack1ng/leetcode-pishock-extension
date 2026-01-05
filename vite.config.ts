import { defineConfig, build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import {
	copyFileSync,
	existsSync,
	readFileSync,
	writeFileSync,
	rmSync,
} from "fs";

const __dirname = import.meta.dirname;

// Replace process.env.NODE_ENV with actual value
const defineEnv = {
	"process.env.NODE_ENV": JSON.stringify("production"),
};

// Plugin to build scripts separately to avoid code splitting issues
function buildExtensionScripts() {
	return {
		name: "build-extension-scripts",
		async closeBundle() {
			// Build content script separately with inlined React + Tailwind
			await build({
				configFile: false,
				plugins: [react(), tailwindcss()],
				base: "./",
				define: defineEnv,
				resolve: {
					alias: {
						"@": path.resolve(__dirname, "./src"),
					},
				},
				build: {
					outDir: "dist",
					emptyOutDir: false,
					lib: {
						entry: path.resolve(__dirname, "src/content/index.tsx"),
						name: "content",
						fileName: () => "content.js",
						formats: ["iife"],
					},
					rollupOptions: {
						output: {
							assetFileNames: "content.[ext]",
						},
					},
				},
				logLevel: "warn",
			});

			// Build background script separately
			await build({
				configFile: false,
				base: "./",
				define: defineEnv,
				resolve: {
					alias: {
						"@": path.resolve(__dirname, "./src"),
					},
				},
				build: {
					outDir: "dist",
					emptyOutDir: false,
					lib: {
						entry: path.resolve(__dirname, "src/background/index.ts"),
						name: "background",
						fileName: () => "background.js",
						formats: ["iife"],
					},
				},
				logLevel: "warn",
			});

			// Copy manifest
			copyFileSync(
				path.resolve(__dirname, "manifest.json"),
				path.resolve(__dirname, "dist/manifest.json")
			);

			// Fix popup HTML path
			const popupSrc = path.resolve(__dirname, "dist/src/popup/index.html");
			const popupDest = path.resolve(__dirname, "dist/popup.html");
			if (existsSync(popupSrc)) {
				let html = readFileSync(popupSrc, "utf-8");
				html = html.replace(/\.\.\/\.\.\/assets\//g, "./assets/");
				writeFileSync(popupDest, html);
			}

			// Clean up src directory in dist
			try {
				rmSync(path.resolve(__dirname, "dist/src"), {
					recursive: true,
					force: true,
				});
			} catch {
				// Ignore errors
			}
		},
	};
}

export default defineConfig({
	plugins: [react(), tailwindcss(), buildExtensionScripts()],
	base: "./",
	define: defineEnv,
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				popup: path.resolve(__dirname, "src/popup/index.html"),
			},
		},
	},
});
