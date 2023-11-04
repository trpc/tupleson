import { defineConfig } from "tsup";

export default defineConfig({
	bundle: false,
	clean: true,
	dts: true,
	entry: ["src/**/*.ts", "!src/**/*.test.*"],
	format: ["cjs", "esm"],
	outDir: "lib",
	plugins: [
		{
			name: "fix-cjs",
			renderChunk(_, chunk) {
				if (this.format === "esm") {
					// replace `from '...js'` with `from '...mjs'` for mjs imports & exports
					const code = chunk.code.replace(
						/from ['"](.*)\.js['"]/g,
						"from '$1.mjs'",
					);
					return { code };
				}
			},
		},
	],
	sourcemap: true,
});
