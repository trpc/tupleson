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
		nonce: () => "__tson",
		types: [],
	});

	const expected: Record<string, unknown> = {};
	expected["a"] = expected;
	expected["b"] = expected;

	const str = t.stringify(expected, 2);
	const res = t.parse(str);

	expect(res).toEqual(expected);
	expect(res).toBe(res["a"]);
	expect(res["b"]).toBe(res["a"]);

	expect(str).toMatchInlineSnapshot(
		`
		"{
		  \\"json\\": {
		    \\"a\\": [
		      \\"CIRCULAR\\",
		      \\"\\",
		      \\"__tson\\"
		    ],
		    \\"b\\": [
		      \\"CIRCULAR\\",
		      \\"\\",
		      \\"__tson\\"
		    ]
		  },
		  \\"nonce\\": \\"__tson\\"
		}"
	`,
	);
});

test("back-reference: circular array reference", () => {
	const t = createTson({
		nonce: () => "__tson",
		types: [],
	});

	const expected: unknown[] = [];
	expected[0] = expected;
	expected[1] = expected;

	const str = t.stringify(expected, 2);
	const res = t.parse(str);

	expect(res).toEqual(expected);
	expect(res).toBe(res[0]);
	expect(res[1]).toBe(res[0]);

	expect(str).toMatchInlineSnapshot(`
		"{
		  \\"json\\": [
		    [
		      \\"CIRCULAR\\",
		      \\"\\",
		      \\"__tson\\"
		    ],
		    [
		      \\"CIRCULAR\\",
		      \\"\\",
		      \\"__tson\\"
		    ]
		  ],
		  \\"nonce\\": \\"__tson\\"
		}"
	`);
});

test("back-reference: non-circular complex reference", () => {
	const t = createTson({
		nonce: () => "__tson",
		types: [tsonDate],
	});

	const expected: Record<string, unknown> = {};
	expected["a"] = {};
	expected["b"] = expected["a"];
	expected["c"] = new Date(0);
	expected["d"] = expected["c"];

	const str = t.stringify(expected, 2);
	const res = t.parse(str);

	expect(res).toEqual(expected);
	expect(res["b"]).toBe(res["a"]);
	expect(res["d"]).toBe(res["c"]);

	expect(str).toMatchInlineSnapshot(
		`
		"{
		  \\"json\\": {
		    \\"a\\": {},
		    \\"b\\": [
		      \\"CIRCULAR\\",
		      \\"a\\",
		      \\"__tson\\"
		    ],
		    \\"c\\": [
		      \\"Date\\",
		      \\"1970-01-01T00:00:00.000Z\\",
		      \\"__tson\\"
		    ],
		    \\"d\\": [
		      \\"CIRCULAR\\",
		      \\"c\\",
		      \\"__tson\\"
		    ]
		  },
		  \\"nonce\\": \\"__tson\\"
		}"
	`,
	);
});

test("back-reference: grandparent reference", () => {
	const t = createTson({
		nonce: () => "__tson",
		types: [tsonDate],
	});

	const expected: Record<string, any> = {
		a: {
			a: {
				b: {
					a: null,
				},
			},
		},
	};
	expected["a"].a.b.a = expected["a"].a;

	const str = t.stringify(expected, 2);
	const res = t.parse(str);

	expect(str).toMatchInlineSnapshot(`
		"{
		  \\"json\\": {
		    \\"a\\": {
		      \\"a\\": {
		        \\"b\\": {
		          \\"a\\": [
		            \\"CIRCULAR\\",
		            \\"a__tsona\\",
		            \\"__tson\\"
		          ]
		        }
		      }
		    }
		  },
		  \\"nonce\\": \\"__tson\\"
		}"
	`);
	expect(res).toEqual(expected);
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
