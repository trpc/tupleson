import { expect, test } from "vitest";

test("without crypto", async () => {
	const before = global.crypto;

	global.crypto = undefined as any;

	const { getNonce } = await import("./getNonce.js");

	expect(getNonce().length).toBeGreaterThan(20);

	global.crypto = before;
});
