import { expect, test } from "vitest";

import { createTsonAsync } from "./async/createTsonAsync.js";
import { TsonOptions, TsonType, createTson } from "./index.js";
import { expectError, waitError } from "./internals/testUtils.js";

test("multiple handlers for primitive string found", () => {
	const stringHandler = {
		primitive: "string",
	} as TsonType<string, string>;
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

test("async: duplicate keys", async () => {
	const str = "hello world";

	async function* generator() {
		await Promise.resolve();
		yield str;
	}

	const stringHandler: TsonType<string, string> = {
		deserialize: (v) => v,
		key: "string",
		serialize: (v) => v,
		test: (v) => typeof v === "string",
	};

	const err = await waitError(async () => {
		const gen = generator();
		await createTsonAsync({
			types: [stringHandler, stringHandler],
		}).parseJsonStream(gen);
	});

	expect(err).toMatchInlineSnapshot(
		"[Error: Multiple handlers for key string found]",
	);
});

test("async: multiple handlers for primitive string found", async () => {
	const stringHandler = {
		primitive: "string",
	} as TsonType<string, string>;

	const err = await waitError(async () => {
		const iterator = createTsonAsync({
			types: [stringHandler, stringHandler],
		}).stringifyJsonStream({});

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for await (const _ of iterator) {
			// noop
		}
	});

	expect(err).toMatchInlineSnapshot(
		"[Error: Multiple handlers for primitive string found]",
	);
});

test("async: bad init", async () => {
	const str = "hello world";

	async function* generator() {
		await Promise.resolve();
		yield str;
	}

	const err = await waitError(async () => {
		const gen = generator();
		await createTsonAsync({
			types: [],
		}).parseJsonStream(gen);
	});

	expect(err).toMatchInlineSnapshot(
		"[TsonStreamInterruptedError: Stream interrupted: Stream ended unexpectedly (state 0)]",
	);
});
