import { expect, test } from "vitest";

test("without crypto", async () => {
	const before = global.crypto;

	global.crypto = undefined as any;

	const { getDefaultNonce } = await import("./getNonce.js");

	expect(getDefaultNonce().length).toBeGreaterThan(20);

	global.crypto = before;
});
