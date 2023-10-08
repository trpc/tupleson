import { expect, test } from "vitest";

import {
	TsonOptions,
	TsonType,
	createTson,
	createTsonAsync,
	tsonDate,
} from "./index.js";
import { waitError } from "./internals/testUtils.js";

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

test("back-reference: circular object reference", () => {
	const t = createTson({
		types: [],
	});

	const expected: Record<string, unknown> = {};
	expected["a"] = expected;
	expected["b"] = expected;

	const str = t.stringify(expected);
	const res = t.parse(str);

	expect(res).toEqual(expected);
	expect(res).toBe(res["a"]);
	expect(res["b"]).toBe(res["a"]);
});

test("back-reference: circular array reference", () => {
	const t = createTson({
		types: [],
	});

	const expected: unknown[] = [];
	expected[0] = expected;
	expected[1] = expected;

	const str = t.stringify(expected);
	const res = t.parse(str);

	expect(res).toEqual(expected);
	expect(res).toBe(res[0]);
	expect(res[1]).toBe(res[0]);
});

test("back-reference: non-circular complex reference", () => {
	const t = createTson({
		types: [tsonDate],
	});

	const expected: Record<string, unknown> = {};
	expected["a"] = {};
	expected["b"] = expected["a"];
	expected["c"] = new Date();
	expected["d"] = expected["c"];

	const str = t.stringify(expected);
	const res = t.parse(str);

	expect(res).toEqual(expected);
	expect(res["b"]).toBe(res["a"]);
	expect(res["d"]).toBe(res["c"]);
});

/**
 * WILL NOT WORK: the async serialize/deserialize functions haven't
 * been adapted to handle back-references yet
 */
// test("async: back-reference", async () => {
// 	const t = createTsonAsync({
// 		types: [tsonPromise],
// 	});

// 	const needle = {}

// 	const expected = {
// 		a: needle,
// 		b: Promise.resolve(needle),
// 	};

// 	const str = await t.stringify(expected);
// 	const res = await t.parse(str);

// 	expect(res).toEqual(expected);
// 	expect(res.a).toBe(await res.b);
// })

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
		}).parse(gen);
	});

	expect(err).toMatchInlineSnapshot(
		"[Error: Multiple handlers for key string found]",
	);
});

test("async: multiple handlers for primitive string found", async () => {
	const stringHandler: TsonType<string, never> = {
		primitive: "string",
	};

	const err = await waitError(async () => {
		const iterator = createTsonAsync({
			types: [stringHandler, stringHandler],
		}).stringify({});

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
		}).parse(gen);
	});

	expect(err).toMatchInlineSnapshot(
		"[TsonError: Failed to initialize TSON stream]",
	);
});
