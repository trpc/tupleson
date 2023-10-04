import { expect, test } from "vitest";

test("with crypto", async () => {
	const before = global.crypto;

	global.crypto = {
		randomUUID: () => "test",
	} as any;
	const { getNonce } = await import("./getNonce.js");

	expect(getNonce()).toBe("test");

	global.crypto = before;
});
