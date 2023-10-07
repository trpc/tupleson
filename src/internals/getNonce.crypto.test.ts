import { expect, test } from "vitest";

test("with crypto", async () => {
	const before = global.crypto;

	global.crypto = {
		randomUUID: () => "test",
	} as any;
	const { getNonceDefault } = await import("./getNonce.js");

	expect(getNonceDefault()).toBe("test");

	global.crypto = before;
});
