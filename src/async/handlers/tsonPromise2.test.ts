import { expect, test } from "vitest";

import { TsonType } from "../../index.js";
import { createPromise, expectSequence } from "../../internals/testUtils.js";
import { ChunkTypes, TsonAsyncTuple, TsonStatus } from "../asyncTypes2.js";
import { createTsonSerializeAsync } from "../serializeAsync2.js";
import { tsonPromise } from "./tsonPromise2.js";

const nonce = "__tson";
const anyId = expect.stringMatching(`^${nonce}[0-9]+$`);
const idOf = (id: TsonAsyncTuple | number | string) => {
	if (Array.isArray(id)) {
		return id[1][0];
	}

	return `${nonce}${id}`;
};

const tsonError: TsonType<Error, { message: string }> = {
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
	const serialize = createTsonSerializeAsync({
		nonce: () => nonce,
		types: [tsonPromise],
	});

	const promise = Promise.resolve(42);
	const iterator = serialize(promise);

	const chunks: TsonAsyncTuple[] = [];
	for await (const value of iterator) {
		chunks.push(value);
	}

	const heads = chunks.filter((chunk) => chunk[0] === ChunkTypes.HEAD);
	const tails = chunks.filter((chunk) => chunk[0] === ChunkTypes.TAIL);
	const leaves = chunks.filter((chunk) => chunk[0] === ChunkTypes.LEAF);

	expect(chunks.length).toBe(6);
	expect(heads).toHaveLength(2);
	expect(tails).toHaveLength(2);
	expect(leaves).toHaveLength(2);

	expectSequence(chunks)
		.toHaveAll(heads)
		.beforeAll([...leaves, ...tails]);

	heads.forEach((_, i) => {
		expectSequence(chunks).toHave(heads[i]!).beforeAll([tails[i]!, leaves[i]!]);
		expectSequence(chunks).toHave(tails[i]!).afterAll([heads[i]!, leaves[i]!]);
	});
});

test("serialize promise that returns a promise", async () => {
	const serialize = createTsonSerializeAsync({
		nonce: () => nonce,
		types: [tsonPromise],
	});

	const expected = 42;

	const obj = {
		promise: createPromise(() => {
			return {
				anotherPromise: createPromise(() => {
					return expected;
				}),
			};
		}),
	};

	const iterator = serialize(obj);
	const chunks: TsonAsyncTuple[] = [];

	for await (const value of iterator) {
		chunks.push(value);
	}

	const heads = chunks.filter((chunk) => chunk[0] === ChunkTypes.HEAD);
	const tails = chunks.filter((chunk) => chunk[0] === ChunkTypes.TAIL);
	const leaves = chunks.filter((chunk) => chunk[0] === ChunkTypes.LEAF);

	expect(chunks).toHaveLength(15);
	expect(heads).toHaveLength(6);
	expect(leaves).toHaveLength(3);
	expect(tails).toHaveLength(6);

	heads.forEach((_, i) => {
		expect(tails.filter((v) => v[1][1] === heads[i]![1][0])).toHaveLength(1);
		expectSequence(chunks)
			.toHave(heads[i]!)
			.beforeAll(
				[...tails, ...leaves].filter((v) => v[1][1] === heads[i]![1][0]),
			);
		expectSequence(chunks)
			.toHave(tails[i]!)
			.afterAll(
				[...heads, ...leaves].filter((v) => v[1][1] === tails[i]![1][0]),
			);
	});

	expect(heads[0]![1][0]).toBe(idOf(0));

	expect(heads).toHaveLength(6);
	expect(leaves).toHaveLength(3);
	expect(tails).toHaveLength(6);

	expect(heads[0]).toStrictEqual([ChunkTypes.HEAD, [idOf(0), nonce, null]]);
	expect(heads[1]).toStrictEqual([
		ChunkTypes.HEAD,
		[anyId, idOf(0), "promise"],
		tsonPromise.key,
	]);

	expect(heads[2]).toStrictEqual([ChunkTypes.HEAD, [anyId, anyId, null]]);
	expect(heads[3]).toStrictEqual([ChunkTypes.HEAD, [anyId, anyId, 1]]);
	expect(heads[4]).toStrictEqual([
		ChunkTypes.HEAD,
		[anyId, anyId, "anotherPromise"],
		tsonPromise.key,
	]);
	expect(heads[5]).toStrictEqual([ChunkTypes.HEAD, [anyId, anyId, null]]);
});

test("promise that rejects", async () => {
	const serialize = createTsonSerializeAsync({
		nonce: () => nonce,
		types: [tsonPromise, tsonError],
	});

	const promise = Promise.reject(new Error("foo"));
	const iterator = serialize(promise);

	const chunks: TsonAsyncTuple[] = [];
	const expected = { message: "foo" };

	for await (const value of iterator) {
		chunks.push(value);
	}

	expect(chunks.length).toBe(6);

	const heads = chunks.filter((chunk) => chunk[0] === ChunkTypes.HEAD);
	const tails = chunks.filter((chunk) => chunk[0] === ChunkTypes.TAIL);
	const leaves = chunks.filter((chunk) => chunk[0] === ChunkTypes.LEAF);

	expectSequence(chunks)
		.toHaveAll(heads)
		.beforeAll([...leaves, ...tails]);

	heads.forEach((_, i) => {
		expect(tails.filter((v) => v[1][1] === heads[i]![1][0])).toHaveLength(1);
		expectSequence(chunks)
			.toHave(heads[i]!)
			.beforeAll(
				[...tails, ...leaves].filter((v) => v[1][1] === heads[i]![1][0]),
			);
		expectSequence(chunks)
			.toHave(tails[i]!)
			.afterAll(
				[...heads, ...leaves].filter((v) => v[1][1] === tails[i]![1][0]),
			);
	});

	expect(heads[0]![1][0]).toBe(idOf(0));

	expect(heads).toHaveLength(2);
	expect(tails).toHaveLength(2);
	expect(leaves).toHaveLength(2);

	expect(heads[0]).toStrictEqual([
		ChunkTypes.HEAD,
		[idOf(0), nonce, null],
		tsonPromise.key,
	]);

	expect(heads[1]).toEqual([ChunkTypes.HEAD, [anyId, idOf(0), null]]);
	expect(leaves[0]).toEqual([ChunkTypes.LEAF, [anyId, anyId, 0], 1]);
	expect(leaves[1]).toEqual([
		ChunkTypes.LEAF,
		[anyId, anyId, 1],
		expected,
		tsonError.key,
	]);
});

test("racing promises", async () => {
	const serialize = createTsonSerializeAsync({
		nonce: () => nonce,
		types: [tsonPromise],
	});

	const iterator = serialize({
		promise: createPromise(() => {
			return {
				promise1: createPromise(() => {
					return 42;
				}, Math.random() * 100),
				promise2: createPromise(() => {
					return 43;
				}, Math.random() * 100),
			};
		}),
	});

	const chunks: TsonAsyncTuple[] = [];

	for await (const value of iterator) {
		chunks.push(value);
	}

	const heads = chunks.filter((chunk) => chunk[0] === ChunkTypes.HEAD);
	const leaves = chunks.filter((chunk) => chunk[0] === ChunkTypes.LEAF);
	const tails = chunks.filter((chunk) => chunk[0] === ChunkTypes.TAIL);

	expect(chunks).toHaveLength(21);
	expect(heads).toHaveLength(8);
	expect(leaves).toHaveLength(5);
	expect(tails).toHaveLength(8);

	heads.forEach((_, i) => {
		expect(tails.filter((v) => v[1][1] === heads[i]![1][0])).toHaveLength(1);
		expectSequence(chunks)
			.toHave(heads[i]!)
			.beforeAll(
				[...tails, ...leaves].filter((v) => v[1][1] === heads[i]![1][0]),
			);
		expectSequence(chunks)
			.toHave(tails[i]!)
			.afterAll(
				[...heads, ...leaves].filter((v) => v[1][1] === tails[i]![1][0]),
			);
	});
});
