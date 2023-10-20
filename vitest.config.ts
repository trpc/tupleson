import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		coverage: {
			all: true,
			exclude: ["lib"],
			include: ["src"],
			reporter: ["html", "lcov"],
		},
		exclude: ["lib", "node_modules", "examples", "benchmark"],
		setupFiles: [
			// this is useful to comment out sometimes
			"console-fail-test/setup",
		],
	},
});
