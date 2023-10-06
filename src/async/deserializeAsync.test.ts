import { expect, test, vi } from "vitest";

import {
	createTsonAsync,
	tsonAsyncIterator,
	tsonBigint,
	tsonPromise,
} from "../index.js";
import { assert } from "../internals/assert.js";
import { createTestServer } from "../internals/testUtils.js";
import { TsonAsyncOptions } from "./asyncTypes.js";

function createBodyStream(iterator: AsyncIterable<string>) {
	return new ReadableStream<Uint8Array>({
		async start(controller) {
			const encoder = new TextEncoder();
			for await (const chunk of iterator) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		}
	})
}

test("deserialize variable chunk length", async () => {
	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonAsyncIterator, tsonPromise, tsonBigint],
	});
	{
		const body = createBodyStream((async function* () {
			await new Promise((resolve) => setTimeout(resolve, 1));
			yield '[\n{"json":{"foo":"bar"},"nonce":"__tson"}';
			yield "\n,\n[\n]\n]";
		})());
		const result = await tson.parse(body);
		expect(result).toEqual({ foo: "bar" });
	}

	{
		const body = createBodyStream((async function* () {
			await new Promise((resolve) => setTimeout(resolve, 1));
			yield '[\n{"json":{"foo":"bar"},"nonce":"__tson"}\n,\n[\n]\n]';
		})());
		const result = await tson.parse(body);
		expect(result).toEqual({ foo: "bar" });
	}

	{
		const body = createBodyStream((async function* () {
			await new Promise((resolve) => setTimeout(resolve, 1));
			yield '[\n{"json"';
			yield ':{"foo":"b';
			yield 'ar"},"nonce":"__tson"}\n,\n';
			yield "[\n]\n";
			yield "]";
		})());
		const result = await tson.parse(body);
		expect(result).toEqual({ foo: "bar" });
	}
});

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
		const body = createBodyStream(strIterable);
		const result = await tson.parse(body);

		expect(result).toEqual(obj);
	}

	{
		// promise
		const obj = {
			foo: Promise.resolve("bar"),
		};

		const strIterable = tson.stringify(obj);
		const body = createBodyStream(strIterable);
		const resultRaw = await tson.parse(body);
		const result = resultRaw as typeof obj;

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
		yield 3n;

		await new Promise((resolve) => setTimeout(resolve, 2));
		yield 4n;
		yield 5n;
	}

	const input = {
		foo: "bar",
		iterable: iterable(),
		promise: Promise.resolve(42),
	};

	const strIterable = tson.stringify(input);
	const body = createBodyStream(strIterable);
	const outputRaw = await tson.parse(body);
	const output = outputRaw as typeof input;

	expect(output.foo).toEqual("bar");

	expect(await output.promise).toEqual(42);

	const result = [];

	for await (const value of output.iterable) {
		result.push(value);
	}

	expect(result).toEqual([1n, 2n, 3n, 4n, 5n]);
});

test("e2e: stringify async iterable and promise over the network", async () => {
	function createMockObj() {
		async function* generator() {
			for (const number of [1n, 2n, 3n, 4n, 5n]) {
				await new Promise((resolve) => setTimeout(resolve, 1));
				yield number;
			}
		}

		return {
			foo: "bar",
			iterable: generator(),
			promise: Promise.resolve(42),
			rejectedPromise: Promise.reject(new Error("rejected promise")),
		};
	}

	type MockObj = ReturnType<typeof createMockObj>;

	// ------------- server -------------------
	const opts: TsonAsyncOptions = {
		types: [tsonPromise, tsonAsyncIterator, tsonBigint],
	};

	const server = await createTestServer({
		handleRequest: async (_req, res) => {
			const tson = createTsonAsync(opts);

			const obj = createMockObj();
			const strIterarable = tson.stringify(obj, 4);

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

	const parsedRaw = await tson.parse(response.body);
	const parsed = parsedRaw as MockObj;

	expect(parsed.foo).toEqual("bar");

	const results = [];

	for await (const value of parsed.iterable) {
		results.push(value);
	}

	expect(results).toEqual([1n, 2n, 3n, 4n, 5n]);

	expect(await parsed.promise).toEqual(42);

	await expect(
		parsed.rejectedPromise,
	).rejects.toThrowErrorMatchingInlineSnapshot('"Promise rejected"');

	server.close();
});

test("e2e: server crash", async () => {
	function createMockObj() {
		async function* generator() {
			for (const number of [1n, 2n, 3n, 4n, 5n]) {
				await new Promise((resolve) => setTimeout(resolve, 1));
				yield number;
			}
		}

		return {
			foo: "bar",
			iterable: generator(),
			promise: Promise.resolve(42),
			rejectedPromise: Promise.reject(new Error("rejected promise")),
		};
	}

	type MockObj = ReturnType<typeof createMockObj>;

	// ------------- server -------------------
	const opts: TsonAsyncOptions = {
		types: [tsonPromise, tsonAsyncIterator, tsonBigint],
	};

	const server = await createTestServer({
		handleRequest: async (_req, res) => {
			const tson = createTsonAsync(opts);

			const obj = createMockObj();
			const strIterarable = tson.stringify(obj, 4);

			let closed = false
			setTimeout(() => {
				closed = true
				server.close();
			}, 2)

			// res.write(strIterarable);

			for await (const value of strIterarable) {
				if (closed) continue
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

	const parsedRaw = await tson.parse(response.body);
	const parsed = parsedRaw as MockObj;

	expect(parsed.foo).toEqual("bar");

	const results = [];

	for await (const value of parsed.iterable) {
		results.push(value);
	}

	expect(results).toEqual([1n, 2n, 3n, 4n, 5n]);

	expect(await parsed.promise).toEqual(42);

	await expect(
		parsed.rejectedPromise,
	).rejects.toThrowErrorMatchingInlineSnapshot('"Promise rejected"');

	server.close();
});
