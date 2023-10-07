import { expect, test } from "vitest";

test("without crypto", async () => {
	const before = global.crypto;

	global.crypto = undefined as any;

	const { getNonceDefault } = await import("./getNonce.js");

	expect(getNonceDefault().length).toBeGreaterThan(20);

	global.crypto = before;
});
