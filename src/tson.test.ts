import { assert, expect, expectTypeOf, test } from "vitest";

import { tsonRegExp } from "./handlers/index.js";
import { tsonBigint } from "./handlers/tsonBigint.js";
import { tsonDate } from "./handlers/tsonDate.js";
import { tsonMap } from "./handlers/tsonMap.js";
import { tsonNumber } from "./handlers/tsonNumber.js";
import { tsonSet } from "./handlers/tsonSet.js";
import { tsonUndefined } from "./handlers/tsonUndefined.js";
import {
	UnknownObjectGuardError,
	tsonUnknown,
} from "./handlers/tsonUnknown.js";
import { createTupleson } from "./tson.js";

test("Date", () => {
	const ctx = createTupleson({
		types: {
			Date: tsonDate,
		},
	});

	const date = new Date();

	const stringified = ctx.stringify(date);
	const deserialized = ctx.parse(stringified);
	expect(deserialized).toEqual(date);
});

test("number", () => {
	const t = createTupleson({
		types: {
			number: tsonNumber,
		},
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

test("undefined", () => {
	const ctx = createTupleson({
		types: {
			undefined: tsonUndefined,
		},
	});

	const expected = {
		foo: [1, undefined, 2],
	} as const;
	const stringified = ctx.stringify(expected);
	const deserialized = ctx.parse(stringified);

	expect(deserialized).toEqual(expected);
});

test("Map", () => {
	const t = createTupleson({
		types: {
			Map: tsonMap,
		},
	});

	const expected = new Map([["a", "b"]]);

	const stringified = t.stringify(expected);
	const deserialized = t.parse(stringified);
	expect(deserialized).toEqual(expected);
});

test("Set", () => {
	const t = createTupleson({
		types: {
			Set: tsonSet,
		},
	});

	const expected = new Set(["a", "b"]);

	const stringified = t.stringify(expected);
	const deserialized = t.parse(stringified);
	expect(deserialized).toEqual(expected);
});

test("bigint", () => {
	const t = createTupleson({
		types: {
			Map: tsonMap,
			Set: tsonSet,
			bigint: tsonBigint,
		},
	});

	{
		// bigint
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

test("guard unwanted objects", () => {
	// Sets are okay, but not Maps
	const t = createTupleson({
		types: {
			Set: tsonSet,
			// defined last so it runs last
			unknownObjectGuard: tsonUnknown,
		},
	});

	{
		// sets are okay

		const expected = new Set([1]);

		const stringified = t.stringify(expected);
		const deserialized = t.parse(stringified);

		expect(deserialized).toEqual(expected);
	}

	{
		// plain objects are okay
		const expected = { a: 1 };
		const stringified = t.stringify(expected);
		const deserialized = t.parse(stringified);
		expect(deserialized).toEqual(expected);
	}

	{
		// maps are not okay

		const expected = new Map([["a", 1]]);

		const err = expectError(() => t.parse(t.stringify(expected)));
		assert(err instanceof UnknownObjectGuardError);

		expect(err).toMatchInlineSnapshot(
			"[UnknownObjectGuardError: Unknown object found]",
		);
		expect(err.value).toEqual(expected);
	}
});

test("regex", () => {
	const t = createTupleson({
		types: {
			RegExp: tsonRegExp,
		},
	});

	const expected = /foo/g;

	const stringified = t.stringify(expected, 2);

	expect(stringified).toMatchInlineSnapshot(
		`
		"{
		  \\"json\\": [
		    \\"RegExp\\",
		    \\"/foo/g\\",
		    \\"__tson\\"
		  ],
		  \\"nonce\\": \\"__tson\\"
		}"
	`,
	);

	const deserialized = t.parse(stringified);

	expect(deserialized).toBeInstanceOf(RegExp);
	expect(deserialized).toMatchInlineSnapshot("/foo/g");
	expect(deserialized + "").toEqual(expected + "");
});

test("lets have a look at the stringified output", () => {
	const t = createTupleson({
		types: {
			Map: tsonMap,
			Set: tsonSet,
			bigint: tsonBigint,
			undefined: tsonUndefined,
		},
	});

	const expected = new Set([
		//
		1,
		"string",
		undefined,
		null,
		true,
		false,
		1n,
		new Map([["foo", "bar"]]),
	]);

	const stringified = t.stringify(expected, 2);

	expect(stringified).toMatchInlineSnapshot(`
		"{
		  \\"json\\": [
		    \\"Set\\",
		    [
		      1,
		      \\"string\\",
		      [
		        \\"undefined\\",
		        0,
		        \\"__tson\\"
		      ],
		      null,
		      true,
		      false,
		      [
		        \\"bigint\\",
		        \\"1\\",
		        \\"__tson\\"
		      ],
		      [
		        \\"Map\\",
		        [
		          [
		            \\"foo\\",
		            \\"bar\\"
		          ]
		        ],
		        \\"__tson\\"
		      ]
		    ],
		    \\"__tson\\"
		  ],
		  \\"nonce\\": \\"__tson\\"
		}"
	`);

	const deserialized = t.parse(stringified);

	expect(deserialized).toEqual(expected);
});

test("types", () => {
	const t = createTupleson({
		types: {
			bigint: tsonBigint,
		},
	});

	const expected = 1n;
	{
		const stringified = t.stringify(expected);
		//    ^?
		const parsed = t.parse(stringified);
		//    ^?

		expectTypeOf(parsed).toEqualTypeOf(expected);
	}

	{
		const serialized = t.serializer(expected);
		//    ^?
		const deserialized = t.deserialize(serialized);
		//    ^?

		expectTypeOf(deserialized).toEqualTypeOf(expected);
	}
});
