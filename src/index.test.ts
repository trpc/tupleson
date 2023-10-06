import { expect, test, vitest } from "vitest";

import {
	TsonOptions,
	TsonType,
	createTson,
	createTsonAsync,
	tsonPromise,
} from "./index.js";
import { expectError, waitError, waitFor } from "./internals/testUtils.js";
import { TsonSerialized } from "./types.js";

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

test("async: bad values", async () => {
	async function* generator() {
		await Promise.resolve();

		yield "[" + "\n";

		const obj = {
			json: {
				foo: ["Promise", 0, "__tson"],
			},
			nonce: "__tson",
		} as TsonSerialized<any>;
		yield JSON.stringify(obj) + "\n";

		await Promise.resolve();

		yield "  ," + "\n";
		yield "  [" + "\n";
		// [....... values should be here .......]
		yield "  ]" + "\n";
		yield "]";
	}

	const onErrorSpy = vitest.fn();
	await createTsonAsync({
		onStreamError: onErrorSpy,
		types: [tsonPromise],
	}).parse(generator());

	await waitFor(() => {
		expect(onErrorSpy).toHaveBeenCalledTimes(1);
	});

	expect(onErrorSpy.mock.calls[0][0]).toMatchInlineSnapshot(
		'[TsonError: Stream interrupted: Not all streams were closed]',
	);
});
