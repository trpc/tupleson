import { expect, test } from "vitest";

import {
	createTson,
	createTsonAsync,
	tsonAsyncIterator,
	tsonBigint,
	tsonPromise,
} from "../index.js";

test("deserialize async iterable", async () => {
	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonAsyncIterator, tsonPromise, tsonBigint],
	});

	{
		// plain obj
		const obj = {
			foo: "bar",
		};

		const strIterable = tson.stringify(obj);

		const result = await tson.parse(strIterable);

		expect(result).toEqual(obj);
	}

	{
		// promise
		const obj = {
			foo: Promise.resolve("bar"),
		};

		const strIterable = tson.stringify(obj);

		const result = await tson.parse(strIterable);

		expect(await result.foo).toEqual("bar");
	}
});

test("stringify async iterable + promise", async () => {
	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonAsyncIterator, tsonPromise, tsonBigint],
	});

	async function* iterable() {
		await new Promise((resolve) => setTimeout(resolve, 1));
		yield 1n;
		yield 2n;
	}

	const input = {
		foo: "bar",
		iterable: iterable(),
		promise: Promise.resolve(42),
	};

	const strIterable = tson.stringify(input);

	const output = await tson.parse(strIterable);

	expect(output.foo).toEqual("bar");

	expect(await output.promise).toEqual(42);

	const result = [];

	for await (const value of output.iterable) {
		result.push(value);
	}

	expect(result).toEqual([1n, 2n]);
});
