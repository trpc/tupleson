import { expect, test } from "vitest";

import { assert } from "./assert.js";

test("assert", () => {
	assert(true, "true is true");

	expect(() => {
		assert(false, "false is false");
	}).toThrowErrorMatchingInlineSnapshot('"false is false"');
});
