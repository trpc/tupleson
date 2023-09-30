import { expect, test } from "vitest";

import { expectError } from "../testUtils.js";
import { createTupleson } from "../tson.js";
import { tsonNumber } from "./tsonNumber.js";

test("number", () => {
	const t = createTupleson({
		types: [tsonNumber],
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
