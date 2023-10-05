import { expect, test, vi } from "vitest";

import {
	createTsonAsync,
	tsonAsyncIterator,
	tsonBigint,
	tsonPromise,
} from "../index.js";
import { assert } from "../internals/assert.js";
import {
	mapIterable,
	readableStreamToAsyncIterable,
} from "../internals/iterableUtils.js";
import { createTestServer } from "../internals/testUtils.js";
import { TsonAsyncOptions } from "./asyncTypes.js";

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
	const onErr = vi.fn();
	const tson = createTsonAsync({
		nonce: () => "__tson",
		onStreamError: onErr,
		types: [tsonAsyncIterator, tsonPromise, tsonBigint],
	});

	async function* iterable() {
		await new Promise((resolve) => setTimeout(resolve, 1));
		yield 1n;
		await new Promise((resolve) => setTimeout(resolve, 1));
		yield 2n;
		await new Promise((resolve) => setTimeout(resolve, 30));
		yield 3n;

		await new Promise((resolve) => setTimeout(resolve, 1));
		yield 4n;
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

	expect(result).toEqual([1n, 2n, 3n, 4n]);
});

test.only("e2e: stringify and parse promise with a promise over a network connection", async () => {
	function createMockObj() {
		async function* generator() {
			await new Promise((resolve) => setTimeout(resolve, 1));
			yield 1n;

			await new Promise((resolve) => setTimeout(resolve, 1));
			yield 2n;
		}

		return {
			foo: "bar",
			iterable: generator(),
			promise: Promise.resolve(42),
		};
	}

	type MockObj = ReturnType<typeof createMockObj>;

	const opts: TsonAsyncOptions = {
		nonce: () => "__tson",
		types: [tsonPromise, tsonAsyncIterator, tsonBigint],
	};

	const server = await createTestServer({
		handleRequest: async (_req, res) => {
			const tson = createTsonAsync(opts);

			const obj = createMockObj();
			const strIterarable = tson.stringify(obj, 4);

			// set proper header for chunked responses
			// res.setHeader("Transfer-Encoding", "chunked");

			for await (const value of strIterarable) {
				res.write(value);
			}

			res.end();
		},
	});

	// ------------- client -------------------
	const tson = createTsonAsync(opts);

	// do a streamed fetch request
	const response = await fetch(server.url);

	assert(response.body);

	const textDecoder = new TextDecoder();

	const spy = vi.fn();
	const stringIterator = mapIterable(
		mapIterable(readableStreamToAsyncIterable(response.body), (v) =>
			textDecoder.decode(v),
		),
		(val) => {
			spy(val.trimEnd());
			return val;
		},
	);

	const parsedRaw = await tson.parse(stringIterator);
	const parsed = parsedRaw as MockObj;

	expect(await parsed.promise).toEqual(42);

	const results = [];

	for await (const value of parsed.iterable) {
		results.push(value);
	}

	expect(results).toEqual([1n, 2n]);

	server.close();
});
