import http from "node:http";
import { assert, expect, test } from "vitest";

import {
	TsonAsyncValueTuple,
	createAsyncTsonSerialize,
} from "../async/serializeAsync.js";
import { createTsonAsync, tsonPromise } from "../index.js";
import { TsonSerialized } from "../types.js";

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

async function* readableStreamToAsyncIterable<T>(
	stream: ReadableStream<T>,
): AsyncIterable<T> {
	// Get a lock on the stream
	const reader = stream.getReader();

	try {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while (true) {
			// Read from the stream
			const result = await reader.read();
			// Exit if we're done
			if (result.done) {
				return;
			}

			// Else yield the chunk
			yield result.value;
		}
	} finally {
		reader.releaseLock();
	}
}

async function* mapIterator<T, TValue>(
	iterable: AsyncIterable<T>,
	fn: (v: T) => TValue,
): AsyncIterable<TValue> {
	for await (const value of iterable) {
		yield fn(value);
	}
}

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
		    0,
		    42,
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
		    0,
		    {
		      "anotherPromise": [
		        "Promise",
		        1,
		        "__tson",
		      ],
		    },
		  ],
		  [
		    1,
		    0,
		    42,
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
		    1,
		    [TsonPromiseRejectionError: Promise rejected],
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

	// expect(buffer).toHaveLength(5);
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
		  "        [0,0,\\"bar\\"]",
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

	const full = JSON.parse(buffer.join("")) as [
		TsonSerialized,
		TsonAsyncValueTuple[],
	];

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
		    0,
		    {
		      "anotherPromise": [
		        "Promise",
		        1,
		        "__tson",
		      ],
		    },
		  ],
		  [
		    1,
		    0,
		    42,
		  ],
		]
	`);

	expect(buffer).toMatchInlineSnapshot(`
		[
		  "[",
		  "  {\\"json\\":{\\"promise\\":[\\"Promise\\",0,\\"__tson\\"]},\\"nonce\\":\\"__tson\\"}",
		  "  ,",
		  "  [",
		  "    [0,0,{\\"anotherPromise\\":[\\"Promise\\",1,\\"__tson\\"]}]",
		  "    ,[1,0,42]",
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

// let's do it over an actual network connection
test("stringify and parse promise with a promise over a network connection", async () => {
	interface Obj {
		promise: Promise<{
			anotherPromise: Promise<number>;
			rejectedPromise: Promise<number>;
		}>;
	}

	const server = await new Promise<http.Server>((resolve) => {
		const server = http.createServer((_req, res) => {
			async function handle() {
				const tson = createTsonAsync({
					nonce: () => "__tson",
					types: [tsonPromise],
				});

				const obj: Obj = {
					promise: createPromise(() => {
						return {
							anotherPromise: createPromise(() => {
								return 42;
							}, 8),
							rejectedPromise: createPromise<number>(() => {
								throw new Error("foo");
							}, 10),
						};
					}, 3),
				};
				const strIterarable = tson.stringify(obj, 4);

				for await (const value of strIterarable) {
					res.write(value);
				}

				res.end();
			}

			void handle();
		});

		server.listen(0, () => {
			resolve(server);
		});
	});

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
	const port = (server.address() as any).port as number;

	// do a streamed fetch request
	const response = await fetch(`http://localhost:${port}`);

	assert(response.body);

	// make response.body to an async iterator

	const textDecoder = new TextDecoder();
	const stringIterator = mapIterator(
		readableStreamToAsyncIterable(response.body),
		(v) => textDecoder.decode(v),
	);
	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const value = await tson.parse(stringIterator);
	const asObj = value as Obj;

	const firstPromise = await asObj.promise;

	expect(firstPromise).toHaveProperty("anotherPromise");

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	const err = await firstPromise.rejectedPromise.catch((err) => err);
	assert.instanceOf(err, Error);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	expect(err.cause).toMatchInlineSnapshot(`
		{
		  "name": "TsonPromiseRejectionError",
		}
	`);

	const secondPromise = await firstPromise.anotherPromise;

	expect(secondPromise).toBe(42);

	expect(err).toMatchInlineSnapshot("[TsonError: Promise rejected on server]");

	server.close();
});
