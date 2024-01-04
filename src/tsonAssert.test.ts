import * as v from "vitest";

import type { TsonGuard } from "./tsonAssert.js";

import { createTson } from "./index.js";

v.describe("TsonGuard", () => {
	v.it("should work if the guard is a type guard", () => {
		const guard = {
			assert: (v: unknown): v is string => typeof v === "string",
			key: "string",
		};

		v.expectTypeOf(guard).toMatchTypeOf<TsonGuard<string>>();

		// create a tson instance with the guard
		// serialize and deserialize a string
		const tson = createTson({ guards: [guard], types: [] });
		const serialized = tson.stringify("hello");
		const deserialized = tson.parse(serialized);
		v.expect(deserialized).toEqual("hello");

		// serialize and deserialize a number should throw

		v.expect(() =>
			tson.parse(tson.stringify(1)),
		).toThrowErrorMatchingInlineSnapshot(`"Guard string failed on value 1"`);
	});

	v.it("should work if the guard is an assertion", () => {
		const guard = {
			assert: (v: unknown): asserts v is string => {
				if (typeof v !== "string") {
					throw new Error("Not a string");
				}
			},
			key: "string",
		};

		v.expectTypeOf(guard).toMatchTypeOf<TsonGuard<string>>();

		// create a tson instance with the guard
		// serialize and deserialize a string
		const tson = createTson({ guards: [guard], types: [] });
		const serialized = tson.stringify("hello");
		const deserialized = tson.parse(serialized);
		v.expect(deserialized).toEqual("hello");

		// serialize and deserialize a number should throw
		v.expect(() =>
			tson.parse(tson.stringify(1)),
		).toThrowErrorMatchingInlineSnapshot(`"Not a string"`);
	});
});
