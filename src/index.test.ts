import { expect, test } from "vitest";

import { TsonOptions, TsonType, createTson } from "./index.js";
import { expectError } from "./internals/testUtils.js";

test("multiple handlers for primitive string found", () => {
	const stringHandler: TsonType<string, never> = {
		primitive: "string",
	};
	const opts: TsonOptions = {
		types: [stringHandler, stringHandler],
	};
	expect(() => {
		createTson(opts);
	}).toThrowErrorMatchingInlineSnapshot(
		'"Multiple handlers for primitive string found"',
	);
});

test("duplicate keys", () => {
	const stringHandler: TsonType<string, string> = {
		deserialize: (v) => v,
		key: "string",
		serialize: (v) => v,
		test: (v) => typeof v === "string",
	};
	expect(() => {
		createTson({
			types: [stringHandler, stringHandler],
		});
	}).toThrowErrorMatchingInlineSnapshot(
		'"Multiple handlers for key string found"',
	);
});

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

test("allow duplicate objects", () => {
	const t = createTson({
		types: [],
	});

	const obj = {
		a: 1,
		b: 2,
		c: 3,
	};

	const expected = {
		a: obj,
		b: obj,
		c: obj,
	};

	const actual = t.deserialize(t.serialize(expected));

	expect(actual).toEqual(expected);
});
