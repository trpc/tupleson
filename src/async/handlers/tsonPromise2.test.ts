import { expect, test } from "vitest";

import { TsonType } from "../../index.js";
import { createPromise } from "../../internals/testUtils.js";
import { ChunkTypes, TsonStatus } from "../asyncTypes2.js";
import { createTsonSerializeAsync } from "../serializeAsync2.js";
import { tsonPromise } from "./tsonPromise2.js";

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
	const nonce = "__tson";

	const serialize = createTsonSerializeAsync({
		nonce: () => nonce,
		types: [tsonPromise],
	});

	const promise = Promise.resolve(42);
	const iterator = serialize(promise);

	const values = [];
	for await (const value of iterator) {
		values.push(value);
	}

	const promiseId = `${nonce}0`;
	const arrayId = `${nonce}1`;

	expect(values).toEqual([
		[ChunkTypes.HEAD, [promiseId, nonce, null], tsonPromise.key],
		[ChunkTypes.HEAD, [arrayId, promiseId, null]],
		[ChunkTypes.LEAF, [`${nonce}2`, arrayId, 0], 0],
		[ChunkTypes.TAIL, [`${nonce}3`, promiseId, null], TsonStatus.OK],
		[ChunkTypes.LEAF, [`${nonce}4`, arrayId, 1], 42],
		[ChunkTypes.TAIL, [`${nonce}5`, arrayId, null], TsonStatus.OK],
	]);
});

test("serialize promise that returns a promise", async () => {
	const nonce = "__tson";
	const serialize = createTsonSerializeAsync({
		nonce: () => nonce,
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

	const iterator = serialize(obj);
	const values = [];

	for await (const value of iterator) {
		values.push(value);
	}

	expect(values).toEqual([
		/*
		TODO: The parent IDs are wrong here. They're not correct in the implementation,
		TODO: either, and I don't know what they should be yet.
		*/
		[ChunkTypes.HEAD, [`${nonce}0`, `${nonce}`, null]],
		[ChunkTypes.HEAD, [`${nonce}1`, `${nonce}0`, "promise"], "Promise"],
		[ChunkTypes.TAIL, [`${nonce}2`, `${nonce}0`, null], 200],
		[ChunkTypes.HEAD, [`${nonce}3`, `${nonce}1`, null]],
		[ChunkTypes.TAIL, [`${nonce}4`, `${nonce}1`, null], 200],
		[ChunkTypes.LEAF, [`${nonce}5`, `${nonce}3`, 0], 0],
		[ChunkTypes.HEAD, [`${nonce}6`, `${nonce}3`, 1]],
		[ChunkTypes.HEAD, [`${nonce}7`, `${nonce}6`, "anotherPromise"], "Promise"],
		[ChunkTypes.TAIL, [`${nonce}8`, `${nonce}6`, null], 200],
		[ChunkTypes.TAIL, [`${nonce}9`, `${nonce}7`, null], 200],
		[ChunkTypes.HEAD, [`${nonce}10`, `${nonce}6`, null]],
		[ChunkTypes.TAIL, [`${nonce}11`, `${nonce}9`, null], 200],
		[ChunkTypes.LEAF, [`${nonce}12`, `${nonce}12`, 0], 0],
		[ChunkTypes.LEAF, [`${nonce}13`, `${nonce}11`, 1], 42],
		[ChunkTypes.TAIL, [`${nonce}14`, `${nonce}11`, null], 200],
	]);
});

test("promise that rejects", async () => {
	const nonce = "__tson";
	const serialize = createTsonSerializeAsync({
		nonce: () => nonce,
		types: [tsonPromise, tsonError],
	});

	const promise = Promise.reject(new Error("foo"));
	const iterator = serialize(promise);

	const values = [];
	const expected = { message: "foo" };

	for await (const value of iterator) {
		values.push(value);
	}

	expect(values).toEqual([
		[ChunkTypes.HEAD, [`${nonce}0`, `${nonce}`, null], "Promise"],
		[ChunkTypes.HEAD, [`${nonce}1`, `${nonce}0`, null]],
		[ChunkTypes.LEAF, [`${nonce}2`, `${nonce}1`, 0], 1],
		[ChunkTypes.TAIL, [`${nonce}3`, `${nonce}0`, null], 200],
		[ChunkTypes.LEAF, [`${nonce}5`, `${nonce}1`, 1], expected, "Error"],
		[ChunkTypes.TAIL, [`${nonce}6`, `${nonce}1`, null], 200],
	]);
});
