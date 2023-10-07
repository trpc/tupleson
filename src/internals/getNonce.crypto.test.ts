import { expect, test } from "vitest";

test("with crypto", async () => {
	const before = global.crypto;

	global.crypto = {
		randomUUID: () => "test",
	} as any;
	const { getDefaultNonce } = await import("./getNonce.js");

	expect(getDefaultNonce()).toBe("test");

	global.crypto = before;
});
