import { expect, test } from "vitest";

import { tsonAsyncIterator, tsonPromise } from "../index.js";
import { createAsyncTsonSerialize } from "./serializeAsync.js";

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

test("serialize 2 promises", async () => {
	const serialize = createAsyncTsonSerialize({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const promise = [Promise.resolve(42), Promise.resolve(43)];

	const [head, iterator] = serialize(promise);

	expect(head).toMatchInlineSnapshot(`
		{
		  "json": [
		    [
		      "Promise",
		      0,
		      "__tson",
		    ],
		    [
		      "Promise",
		      1,
		      "__tson",
		    ],
		  ],
		  "nonce": "__tson",
		}
	`);

	const values = [];
	for await (const value of iterator) {
		values.push(value);
	}

	expect(values.length).toBe(2);
	expect(values).toMatchInlineSnapshot(`
		[
		  [
		    0,
		    [
		      0,
		      42,
		    ],
		  ],
		  [
		    1,
		    [
		      0,
		      43,
		    ],
		  ],
		]
	`);
});

test("serialize async iterable", async () => {
	const serialize = createAsyncTsonSerialize({
		nonce: () => "__tson",
		types: [tsonAsyncIterator],
	});

	async function* iterable() {
		await new Promise((resolve) => setTimeout(resolve, 1));
		yield 42;
		await new Promise((resolve) => setTimeout(resolve, 1));
		yield 43;
	}

	const [head, iterator] = serialize(iterable());

	expect(head).toMatchInlineSnapshot(`
		{
		  "json": [
		    "AsyncIterator",
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
		  [
		    0,
		    [
		      0,
		      43,
		    ],
		  ],
		  [
		    0,
		    [
		      2,
		    ],
		  ],
		]
	`);
});
