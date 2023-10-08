import { expect, test } from "vitest";

import { tsonAsyncIterator, tsonBigint, tsonPromise } from "../index.js";
import { sleep } from "../internals/testUtils.js";
import {
	createAsyncTsonSerialize,
	createTsonStringifyAsync,
} from "./serializeAsync.js";

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
		await sleep(1);
		yield 42;
		await sleep(1);
		yield 43;
	}

	const [head, iterator] = serialize(iterable());

	expect(head).toMatchInlineSnapshot(`
		{
		  "json": [
		    "AsyncIterable",
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

test("stringify async iterable + promise", async () => {
	const stringify = createTsonStringifyAsync({
		nonce: () => "__tson",
		types: [tsonAsyncIterator, tsonPromise, tsonBigint],
	});

	async function* iterable() {
		await sleep(1);
		yield 1n;
		yield 2n;
	}

	const obj = {
		foo: "bar",
		iterable: iterable(),
		promise: Promise.resolve(42),
	};
	const buffer: string[] = [];
	for await (const value of stringify(obj, 2)) {
		buffer.push(value.trimEnd());
	}

	const head: any = JSON.parse(buffer[1]!);

	expect(buffer).toMatchInlineSnapshot(`
		[
		  "[",
		  "  {\\"json\\":{\\"foo\\":\\"bar\\",\\"iterable\\":[\\"AsyncIterable\\",0,\\"__tson\\"],\\"promise\\":[\\"Promise\\",1,\\"__tson\\"]},\\"nonce\\":\\"__tson\\"}",
		  "  ,",
		  "  [",
		  "    [1,[0,42]]",
		  "    ,[0,[0,[\\"bigint\\",\\"1\\",\\"__tson\\"]]]",
		  "    ,[0,[0,[\\"bigint\\",\\"2\\",\\"__tson\\"]]]",
		  "    ,[0,[2]]",
		  "]]",
		]
	`);

	expect(head).toMatchInlineSnapshot(`
		{
		  "json": {
		    "foo": "bar",
		    "iterable": [
		      "AsyncIterable",
		      0,
		      "__tson",
		    ],
		    "promise": [
		      "Promise",
		      1,
		      "__tson",
		    ],
		  },
		  "nonce": "__tson",
		}
	`);

	expect(head.json.iterable[0]).toBe("AsyncIterable");
	expect(head.json.promise[0]).toBe("Promise");
});
