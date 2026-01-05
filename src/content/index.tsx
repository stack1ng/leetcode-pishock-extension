import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import ShockerOverlay from "./components/ShockerOverlay";
import { getCodeEditor } from "./dom";
import "./styles.css";
import { Toaster } from "@/components/ui/sonner";

function injectOverlay(): void {
	const codeEditor = getCodeEditor();
	if (!codeEditor) {
		setTimeout(injectOverlay, 500);
		return;
	}

	if (document.getElementById("pishock-overlay-root")) return;

	const computedStyle = window.getComputedStyle(codeEditor);
	if (computedStyle.position === "static") {
		codeEditor.style.position = "relative";
	}

	const mountPoint = document.createElement("div");
	mountPoint.id = "pishock-overlay-root";
	mountPoint.className = "absolute inset-0 size-full pointer-events-none";
	codeEditor.appendChild(mountPoint);

	const root = ReactDOM.createRoot(mountPoint);
	root.render(
		<React.StrictMode>
			<Suspense fallback={null}>
				<ShockerOverlay />
			</Suspense>
			<Toaster position="bottom-right" />
		</React.StrictMode>
	);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", injectOverlay);
} else {
	injectOverlay();
}
