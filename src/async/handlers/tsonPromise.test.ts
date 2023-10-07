import { assert, expect, test } from "vitest";

import {
	TsonAsyncOptions,
	TsonType,
	createAsyncTsonSerialize,
	createTsonAsync,
	createTsonParseAsync,
	createTsonStringifyAsync,
	tsonPromise,
} from "../../index.js";
import {
	createTestServer,
	waitError,
	waitFor,
} from "../../internals/testUtils.js";
import { createTsonParseAsyncInner } from "../deserializeAsync.js";
import {
	mapIterable,
	readableStreamToAsyncIterable,
} from "../iterableUtils.js";
import { TsonAsyncValueTuple } from "../serializeAsync.js";

const createPromise = <T>(result: () => T, wait = 1) => {
	return new Promise<T>((resolve, reject) => {
		setTimeout(() => {
			try {
				const res = result();
				resolve(res);
			} catch (err) {
				reject(err);
			}
		}, wait);
	});
};

const tsonError: TsonType<
	Error,
	{
		message: string;
	}
> = {
	deserialize: (v) => {
		const err = new Error(v.message);
		return err;
	},
	key: "Error",
	serialize: (v) => ({
		message: v.message,
	}),
	test: (v): v is Error => v instanceof Error,
};

test("serialize promise", async () => {
	const serialize = createAsyncTsonSerialize({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const promise = Promise.resolve(42);

	const [head, iterator] = serialize(promise);

	expect(head).toMatchInlineSnapshot(`
		{
		  "json": [
		    "Promise",
		    0,
		    "__tson",
		  ],
		  "nonce": "__tson",
		}
	`);

	const values = [];
	for await (const value of iterator) {
		values.push(value);
	}

	expect(values).toMatchInlineSnapshot(`
		[
		  [
		    0,
		    [
		      0,
		      42,
		    ],
		  ],
		]
	`);
});

test("serialize promise that returns a promise", async () => {
	const serialize = createAsyncTsonSerialize({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const obj = {
		promise: createPromise(() => {
			return {
				anotherPromise: createPromise(() => {
					return 42;
				}),
			};
		}),
	};

	const [head, iterator] = serialize(obj);

	expect(head).toMatchInlineSnapshot(`
		{
		  "json": {
		    "promise": [
		      "Promise",
		      0,
		      "__tson",
		    ],
		  },
		  "nonce": "__tson",
		}
	`);

	const values = [];
	for await (const value of iterator) {
		values.push(value);
	}

	expect(values).toHaveLength(2);

	expect(values).toMatchInlineSnapshot(`
		[
		  [
		    0,
		    [
		      0,
		      {
		        "anotherPromise": [
		          "Promise",
		          1,
		          "__tson",
		        ],
		      },
		    ],
		  ],
		  [
		    1,
		    [
		      0,
		      42,
		    ],
		  ],
		]
	`);
});

test("promise that rejects", async () => {
	const serialize = createAsyncTsonSerialize({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const promise = Promise.reject(new Error("foo"));

	const [head, iterator] = serialize(promise);

	expect(head).toMatchInlineSnapshot(`
		{
		  "json": [
		    "Promise",
		    0,
		    "__tson",
		  ],
		  "nonce": "__tson",
		}
	`);

	const values = [];

	for await (const value of iterator) {
		values.push(value);
	}

	expect(values).toMatchInlineSnapshot(`
		[
		  [
		    0,
		    [
		      1,
		      [Error: foo],
		    ],
		  ],
		]
	`);
});

test("stringifier - no promises", async () => {
	const obj = {
		foo: "bar",
	};

	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const buffer: string[] = [];

	for await (const value of tson.stringify(obj, 4)) {
		buffer.push(value.trimEnd());
	}

	expect(buffer).toMatchInlineSnapshot(`
		[
		  "[",
		  "    {\\"json\\":{\\"foo\\":\\"bar\\"},\\"nonce\\":\\"__tson\\"}",
		  "    ,",
		  "    [",
		  "    ]",
		  "]",
		]
	`);

	expect(JSON.parse(buffer.join(""))).toMatchInlineSnapshot(`
		[
		  {
		    "json": {
		      "foo": "bar",
		    },
		    "nonce": "__tson",
		  },
		  [],
		]
	`);
});

test("stringifier - with promise", async () => {
	const obj = createPromise(() => "bar" as const);

	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const buffer: string[] = [];

	for await (const value of tson.stringify(obj, 4)) {
		buffer.push(value.trimEnd());
	}

	expect(buffer).toMatchInlineSnapshot(`
		[
		  "[",
		  "    {\\"json\\":[\\"Promise\\",0,\\"__tson\\"],\\"nonce\\":\\"__tson\\"}",
		  "    ,",
		  "    [",
		  "        [0,[0,\\"bar\\"]]",
		  "    ]",
		  "]",
		]
	`);
});

test("stringifier - promise in promise", async () => {
	const obj = {
		promise: createPromise(() => {
			return {
				anotherPromise: createPromise(() => {
					return 42;
				}),
			};
		}),
	};

	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const buffer: string[] = [];

	for await (const value of tson.stringify(obj, 2)) {
		buffer.push(value.trimEnd());
	}

	const full = JSON.parse(buffer.join("")) as [unknown, TsonAsyncValueTuple[]];

	const [head, values] = full;
	expect(head).toMatchInlineSnapshot(`
		{
		  "json": {
		    "promise": [
		      "Promise",
		      0,
		      "__tson",
		    ],
		  },
		  "nonce": "__tson",
		}
	`);

	expect(values).toMatchInlineSnapshot(`
		[
		  [
		    0,
		    [
		      0,
		      {
		        "anotherPromise": [
		          "Promise",
		          1,
		          "__tson",
		        ],
		      },
		    ],
		  ],
		  [
		    1,
		    [
		      0,
		      42,
		    ],
		  ],
		]
	`);

	expect(buffer).toMatchInlineSnapshot(`
		[
		  "[",
		  "  {\\"json\\":{\\"promise\\":[\\"Promise\\",0,\\"__tson\\"]},\\"nonce\\":\\"__tson\\"}",
		  "  ,",
		  "  [",
		  "    [0,[0,{\\"anotherPromise\\":[\\"Promise\\",1,\\"__tson\\"]}]]",
		  "    ,[1,[0,42]]",
		  "  ]",
		  "]",
		]
	`);
});

test("pipe stringifier to parser", async () => {
	const obj = {
		foo: createPromise(() => "bar" as const),
	};

	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const strIterarable = tson.stringify(obj, 4);

	const value = await tson.parse(strIterarable);

	expect(value).toHaveProperty("foo");
	expect(await value.foo).toBe("bar");
});

test("stringify and parse promise with a promise", async () => {
	const obj = {
		promise: createPromise(() => {
			return {
				anotherPromise: createPromise(() => {
					return 42;
				}),
			};
		}),
	};
	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const strIterarable = tson.stringify(obj, 4);

	const value = await tson.parse(strIterarable);

	const firstPromise = await value.promise;

	expect(firstPromise).toHaveProperty("anotherPromise");

	const secondPromise = await firstPromise.anotherPromise;

	expect(secondPromise).toBe(42);
});

test("stringify and parse promise with a promise over a network connection", async () => {
	interface Obj {
		promise: Promise<{
			anotherPromise: Promise<number>;
			rejectedPromise: Promise<number>;
		}>;
	}
	const opts: TsonAsyncOptions = {
		nonce: () => "__tson",
		types: [tsonPromise, tsonError],
	};

	const server = await createTestServer({
		handleRequest: async (_req, res) => {
			const tson = createTsonAsync(opts);

			const obj: Obj = {
				promise: createPromise(() => {
					return {
						anotherPromise: createPromise(() => {
							return 42;
						}, 8),
						rejectedPromise: createPromise<number>(() => {
							throw new Error("foo");
						}, 1),
					};
				}, 3),
			};
			const strIterarable = tson.stringify(obj, 4);

			for await (const value of strIterarable) {
				res.write(value);
			}

			res.end();
		},
	});

	// ----- client --------
	const tson = createTsonAsync(opts);

	// do a streamed fetch request
	const response = await fetch(server.url);

	assert(response.body);

	// make response.body to an async iterator

	const textDecoder = new TextDecoder();
	const stringIterator = mapIterable(
		readableStreamToAsyncIterable(response.body),
		(v) => textDecoder.decode(v),
	);

	const value = await tson.parse(stringIterator);
	const asObj = value as Obj;

	const firstPromise = await asObj.promise;

	expect(firstPromise).toHaveProperty("anotherPromise");

	const secondPromise = await firstPromise.anotherPromise;

	expect(secondPromise).toBe(42);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	const err = await firstPromise.rejectedPromise.catch((err) => err);

	expect(err.cause).toMatchInlineSnapshot("undefined");
	assert(err instanceof Error);
	expect(err).toMatchInlineSnapshot("[Error: foo]");

	expect(err.cause).toMatchInlineSnapshot("undefined");

	server.close();
});

test("does not crash node when it receives a promise rejection", async () => {
	const opts: TsonAsyncOptions = {
		nonce: () => "__tson",
		types: [tsonPromise],
	};
	const stringify = createTsonStringifyAsync(opts);

	const parse = createTsonParseAsyncInner(opts);

	const original = {
		foo: createPromise(() => {
			throw new Error("foo");
		}, 5),
	};
	const iterator = stringify(original);

	const [_result, deferreds] = await parse(iterator);

	const result = _result as typeof original;
	await waitFor(() => {
		assert(deferreds.size === 1);
	});

	await waitFor(() => {
		assert(deferreds.size === 0);
	});

	expect(result).toMatchInlineSnapshot(`
		{
		  "foo": Promise {},
		}
	`);

	const err = await waitError(result.foo);

	expect(err).toMatchInlineSnapshot(
		"[TsonPromiseRejectionError: Promise rejected]",
	);
});

test("stringify promise rejection", async () => {
	const opts: TsonAsyncOptions = {
		nonce: () => "__tson",
		types: [tsonPromise, tsonError],
	};
	const stringify = createTsonStringifyAsync(opts);

	const parse = createTsonParseAsync(opts);

	const original = {
		foo: createPromise(() => {
			return {
				err: createPromise(() => {
					throw new Error("foo");
				}, 5),
			};
		}),
	};
	{
		const iterator = stringify(original, 2);
		const buffer: string[] = [];

		for await (const value of iterator) {
			buffer.push(value.trimEnd());
		}

		expect(buffer).toMatchInlineSnapshot(`
		[
		  "[",
		  "  {\\"json\\":{\\"foo\\":[\\"Promise\\",0,\\"__tson\\"]},\\"nonce\\":\\"__tson\\"}",
		  "  ,",
		  "  [",
		  "    [0,[0,{\\"err\\":[\\"Promise\\",1,\\"__tson\\"]}]]",
		  "    ,[1,[1,[\\"Error\\",{\\"message\\":\\"foo\\"},\\"__tson\\"]]]",
		  "  ]",
		  "]",
		]
	`);
	}

	{
		// parse
		const iterator = stringify(original, 2);

		const result = await parse(iterator);

		expect(result).toMatchInlineSnapshot(`
			{
			  "foo": Promise {},
			}
		`);

		const foo = await result.foo;

		const err = await waitError(foo.err);

		expect(err).toMatchInlineSnapshot("[Error: foo]");
	}
});
