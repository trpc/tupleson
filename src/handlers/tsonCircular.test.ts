/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test } from "vitest";

import { createTson } from "../tson.js";
import { tsonCircular } from "./index.js";

test("circular", () => {
	const t = createTson({
		types: [tsonCircular],
	});

	{
		const expected: any = {};

		expected.a = expected;

		expect(t.serialize(expected).json).toBe({
			a: [
				//
				"Circular",
				0, // <-- 0 means that the direct parent is circular target
				"__tson",
			],
		});

		// const deserialized = t.parse(stringified);
		// expect(deserialized).toEqual(expected);
	}

	{
		const expected: any = {
			a: {
				b: {},
			},
		};

		expected.a.b.a = expected;

		expect(t.serialize(expected).json).toBe({
			a: [
				//
				"Circular",
				1, // <-- 1 means that the grandparent is circular target
				"__tson",
			],
		});
	}
});
