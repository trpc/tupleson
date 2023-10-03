import { expect, test } from "vitest";

import {
	TsonAsyncValueTuple,
	createAsyncTsonSerialize,
} from "../async/serializeAsync.js";
import { createTsonAsync, tsonPromise } from "../index.js";
import { TsonSerialized } from "../types.js";

const createPromise = <T>(result: () => T) => {
	return new Promise<T>((resolve) => {
		setTimeout(() => {
			resolve(result());
		}, 1);
	});
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
		buffer.push(value);
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
		buffer.push(value);
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
		buffer.push(value);
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
