import { expect, test } from "vitest";

import { createTson, tsonNumberGuard } from "../../index.js";
import { expectError } from "../../internals/testUtils.js";

test("number", () => {
	const t = createTson({
		guards: [tsonNumberGuard],
		types: [],
	});

	const bad = [
		//
		NaN,
		Infinity,
		-Infinity,
	];
	const good = [1, 0, -1, 1.1, -1.1, "01"];

	const errors: unknown[] = [];

	for (const n of bad) {
		const err = expectError(() => t.parse(t.stringify(n)));
		errors.push(err);
	}

	expect(errors).toMatchInlineSnapshot(`
		[
		  [Error: Encountered NaN],
		  [Error: Encountered Infinity],
		  [Error: Encountered Infinity],
		]
	`);

	for (const n of good) {
		const deserialized = t.parse(t.stringify(n));
		expect(deserialized).toEqual(n);
	}
});
