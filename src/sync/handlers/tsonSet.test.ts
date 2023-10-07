import { expect, test } from "vitest";

import { createTson, tsonSet } from "../../index.js";

test("Set", () => {
	const t = createTson({
		types: [tsonSet],
	});

	const expected = new Set(["a", "b"]);

	const stringified = t.stringify(expected);
	const deserialized = t.parse(stringified);
	expect(deserialized).toEqual(expected);
});
