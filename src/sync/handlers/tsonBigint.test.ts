import { expect, test } from "vitest";

import { createTson, tsonBigint, tsonMap, tsonSet } from "../../index.js";

test("bigint", () => {
	const t = createTson({
		types: [tsonMap, tsonSet, tsonBigint],
	});

	{
		// bigint`
		const expected = 1n;

		const stringified = t.stringify(expected);
		const deserialized = t.parse(stringified);

		expect(deserialized).toEqual(expected);

		{
			// set of BigInt
			const expected = new Set([1n]);

			const stringified = t.stringify(expected);
			const deserialized = t.parse(stringified);

			expect(deserialized).toEqual(expected);
		}

		{
			// set of a map of bigint
			const expected = new Set([new Map([["a", 1n]])]);

			const stringified = t.stringify(expected);
			const deserialized = t.parse(stringified);

			expect(deserialized).toEqual(expected);
		}
	}
});
