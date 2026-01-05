/** @type {import('tailwindcss').Config} */
module.exports = {
	mode: "jit",
	darkMode: "class",
	content: [
		"./tabs/**/*.tsx",
		"./contents/**/*.tsx",
		"./components/**/*.tsx",
		"./lib/**/*.ts",
	],
	theme: {
		extend: {
			colors: {
				amber: {
					400: "#fbbf24",
					500: "#f59e0b",
					600: "#d97706",
				},
			},
			fontFamily: {
				sans: [
					"Inter",
					"system-ui",
					"-apple-system",
					"BlinkMacSystemFont",
					"Segoe UI",
					"sans-serif",
				],
				mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
			},
			animation: {
				"pulse-opacity": "pulse-opacity 0.5s ease-in-out infinite alternate",
			},
			keyframes: {
				"pulse-opacity": {
					from: { opacity: "1" },
					to: { opacity: "0.6" },
				},
			},
		},
	},
	plugins: [],
};
