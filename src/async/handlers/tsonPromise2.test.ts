import { expect, test } from "vitest";

import { createPromise } from "../../internals/testUtils.js";
import { createTsonSerializeAsync } from "../asyncSerialize.js";
import { tsonPromise } from "./tsonPromise2.js";

test("serialize promise", async () => {
	const serialize = createTsonSerializeAsync({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const promise = Promise.resolve(42);

	const iterator = serialize(promise);
	const head = await iterator.next();
	expect(head).toMatchInlineSnapshot(`
		{
		  "done": false,
		  "value": [
		    "head",
		    [
		      "__tson",
		    ],
		    "Promise",
		  ],
		}
	`);

	const values = [];
	for await (const value of iterator) {
		values.push(value);
	}

	expect(values).toMatchInlineSnapshot();
});

// test("serialize promise that returns a promise", async () => {
// 	const serialize = createTsonSerializeAsync({
// 		nonce: () => "__tson",
// 		types: [tsonPromise],
// 	});

// 	const obj = {
// 		promise: createPromise(() => {
// 			return {
// 				anotherPromise: createPromise(() => {
// 					return 42;
// 				}),
// 			};
// 		}),
// 	};

// 	const iterator = serialize(obj);
// 	const head = await iterator.next();
// 	expect(head).toMatchInlineSnapshot(`
// 		{
// 		  "done": false,
// 		  "value": [
// 		    "default",
// 		    [
// 		      "__tson",
// 		    ],
// 		    "{}",
// 		  ],
// 		}
// 	`);

// 	const values = [];
// 	for await (const value of iterator) {
// 		values.push(value);
// 	}

// 	expect(values).toHaveLength(2);

// 	expect(values).toMatchInlineSnapshot();
// });

// test("promise that rejects", async () => {
// 	const serialize = createTsonSerializeAsync({
// 		nonce: () => "__tson",
// 		types: [tsonPromise],
// 	});

// 	const promise = Promise.reject(new Error("foo"));

// 	const iterator = serialize(promise);
// 	const head = await iterator.next();

// 	expect(head).toMatchInlineSnapshot(`
// 		{
// 		  "done": false,
// 		  "value": [
// 		    "head",
// 		    [
// 		      "__tson",
// 		    ],
// 		    "Promise",
// 		  ],
// 		}
// 	`);

// 	const values = [];

// 	for await (const value of iterator) {
// 		values.push(value);
// 	}

// 	expect(values).toMatchInlineSnapshot();
// });
