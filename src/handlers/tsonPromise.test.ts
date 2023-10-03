import { expect, test } from "vitest";

import { createTsonAsync, tsonPromise } from "../index.js";

const createPromise = <T>(result: () => T) => {
	return new Promise<T>((resolve) => {
		setTimeout(() => {
			resolve(result());
		}, 1);
	});
};

test("serialize promise", async () => {
	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const promise = Promise.resolve(42);

	const [head, iterator] = tson.serializeAsync(promise);

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
	const tson = createTsonAsync({
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

	const [head, iterator] = tson.serializeAsync(obj);

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
	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const promise = Promise.reject(new Error("foo"));

	const [head, iterator] = tson.serializeAsync(promise);

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
