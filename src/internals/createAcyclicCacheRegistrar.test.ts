import { expect, test } from "vitest";

import { createTson } from "../index.js";
import { expectError } from "./testUtils.js";

test("no max call stack", () => {
	const t = createTson({
		types: [],
	});

	const expected: Record<string, unknown> = {};
	expected["a"] = expected;

	// stringify should fail b/c of JSON limitations
	const err = expectError(() => t.stringify(expected));

	expect(err.message).toMatchInlineSnapshot('"Circular reference detected"');
});
