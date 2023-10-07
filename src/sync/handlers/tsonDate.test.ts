import { expect, test } from "vitest";

import { createTson, tsonDate } from "../../index.js";

test("Date", () => {
	const ctx = createTson({
		types: [tsonDate],
	});

	const date = new Date();

	const stringified = ctx.stringify(date);
	const deserialized = ctx.parse(stringified);
	expect(deserialized).toEqual(date);
});
