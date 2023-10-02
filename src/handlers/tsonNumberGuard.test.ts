import { expect, test } from "vitest";

import { createTson } from "../createTson.js";
import { expectError } from "../internals/testUtils.js";
import { tsonNumberGuard } from "./index.js";

test("number", () => {
	const t = createTson({
		types: [tsonNumberGuard],
	});

	const bad = [
		//
		NaN,
		Infinity,
		-Infinity,
	];
	const good = [1, 0, -1, 1.1, -1.1];

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
