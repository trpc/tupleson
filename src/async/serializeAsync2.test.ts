import { assertType, describe, expect, test } from "vitest";

import { tsonBigint } from "../index.js";
import { expectSequence } from "../internals/testUtils.js";
import { ChunkTypes, TsonAsyncTuple, TsonStatus } from "./asyncTypes2.js";
import { tsonPromise } from "./handlers/tsonPromise2.js";
import { createTsonSerializeAsync } from "./serializeAsync2.js";

const nonce = "__tson";
const anyId = expect.stringMatching(`^${nonce}[0-9]+$`);
const idOf = (id: number | string) => `${nonce}${id}`;

describe("serialize", (it) => {
	it("should handle primitives correctly", async ({ expect }) => {
		const options = {
			guards: [],
			nonce: () => nonce,
			types: [
				// Primitive handler mock
				{
					deserialize: (val: string) => val.toLowerCase(),
					key: "string",
					primitive: "string" as const,
					serialize: (val: string) => val.toUpperCase(),
				},
			],
		};

		const serialize = createTsonSerializeAsync(options);
		const source = "hello";
		const chunks: TsonAsyncTuple[] = [];

		for await (const chunk of serialize(source)) {
			chunks.push(chunk);
		}

		expect(chunks.length).toBe(1);
		expect(chunks).toEqual([
			[ChunkTypes.LEAF, [idOf(0), nonce, null], "HELLO", "string"],
		]);
	});

	it("should handle circular references", async ({ expect }) => {
		const options = { guards: [], nonce: () => nonce, types: [] };
		const serialize = createTsonSerializeAsync(options);
		const object: any = {};
		const chunks = [];
		const rootId = idOf(0);

		// Create a circular reference
		object.self = object;

		for await (const chunk of serialize(object)) {
			chunks.push(chunk);
		}

		expect(chunks.length).toBe(3);
		expect(chunks).toEqual([
			[ChunkTypes.HEAD, [rootId, nonce, null]],
			[ChunkTypes.REF, [anyId, rootId, "self"], rootId],
			[ChunkTypes.TAIL, [anyId, rootId, null], TsonStatus.OK],
		]);
	});

	test.each([
		["number", 0],
		["string", "hello"],
		["boolean", true],
		["null", null],
	])(
		`should serialize %s primitives without a handler`,
		async (type, value) => {
			const options = { guards: [], nonce: () => nonce, types: [] };
			const serialize = createTsonSerializeAsync(options);
			const chunks: TsonAsyncTuple[] = [];
			for await (const chunk of serialize(value)) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBe(1);
			expect(chunks).toEqual([
				[ChunkTypes.LEAF, [idOf(0), nonce, null], value],
			]);
		},
	);

	it("should serialize values with a sync handler", async ({ expect }) => {
		const options = {
			guards: [],
			nonce: () => nonce,
			types: [tsonBigint],
		};

		const serialize = createTsonSerializeAsync(options);
		const source = 0n;
		const chunks = [];

		for await (const chunk of serialize(source)) {
			chunks.push(chunk);
		}

		assertType<TsonAsyncTuple[]>(chunks);
		expect(chunks.length).toBe(1);
		expect(chunks).toEqual([
			[ChunkTypes.LEAF, [idOf(0), nonce, null], "0", "bigint"],
		]);
	});
});

describe("serializeAsync", (it) => {
	it("should serialize values with an async handler", async ({ expect }) => {
		const options = {
			guards: [],
			nonce: () => nonce,
			types: [tsonPromise],
		};

		const serialize = createTsonSerializeAsync(options);
		const source = Promise.resolve("hello");
		const chunks: TsonAsyncTuple[] = [];

		for await (const chunk of serialize(source)) {
			chunks.push(chunk);
		}

		const heads = chunks.filter((chunk) => chunk[0] === ChunkTypes.HEAD);
		const tails = chunks.filter((chunk) => chunk[0] === ChunkTypes.TAIL);
		const leaves = chunks.filter((chunk) => chunk[0] === ChunkTypes.LEAF);

		const head_1_id = heads[0]![1][0];
		const head_2_id = heads[1]![1][0];

		expect(chunks.length).toBe(6);

		expectSequence(chunks)
			.toHaveAll(heads)
			.beforeAll([...leaves, ...tails]);

		heads.forEach((_, i) => {
			expectSequence(chunks)
				.toHave(heads[i]!)
				.beforeAll([tails[i]!, leaves[i]!]);
			expectSequence(chunks)
				.toHave(tails[i]!)
				.afterAll([heads[i]!, leaves[i]!]);
		});

		expect(head_1_id).toBe(idOf(0));

		expect(heads).toHaveLength(2);
		expect(tails).toHaveLength(2);
		expect(leaves).toHaveLength(2);

		expect(heads).toStrictEqual([
			[ChunkTypes.HEAD, [head_1_id, nonce, null], tsonPromise.key],
			[ChunkTypes.HEAD, [head_2_id, head_1_id, null]],
		]);

		expect(leaves).toStrictEqual([
			[ChunkTypes.LEAF, [anyId, head_2_id, 0], 0],
			[ChunkTypes.LEAF, [anyId, head_2_id, 1], "hello"],
		]);

		expect(tails).toStrictEqual([
			[ChunkTypes.TAIL, [anyId, head_1_id, null], TsonStatus.OK],
			[ChunkTypes.TAIL, [anyId, head_2_id, null], TsonStatus.OK],
		]);
	});

	it("should apply guards and throw if they fail", async ({ expect }) => {
		const options = {
			guards: [{ assert: (val: unknown) => val !== "fail", key: "testGuard" }],
			types: [],
		};
		const serialize = createTsonSerializeAsync(options);
		const failingValue = "fail";
		let error;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for await (const _ of serialize(failingValue)) {
				// Do nothing
			}
		} catch (e) {
			error = e;
		}

		expect(error).toBeDefined();
		expect(error).toBeInstanceOf(Error);
		expect(error).toHaveProperty(
			"message",
			"Guard testGuard failed on value fail",
		);
	});

	it("should apply guards and not throw if they pass", async ({ expect }) => {
		const options = {
			guards: [{ assert: (val: unknown) => val !== "fail", key: "testGuard" }],
			types: [],
		};
		const serialize = createTsonSerializeAsync(options);
		const passingValue = "pass";
		let error;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for await (const _ of serialize(passingValue)) {
				// Do nothing
			}
		} catch (e) {
			error = e;
		}

		expect(error).toBeUndefined();
	});

	it("should apply guards and not throw if they return undefined", async ({
		expect,
	}) => {
		const options = {
			guards: [{ assert: () => undefined, key: "testGuard" }],
			types: [],
		};
		const serialize = createTsonSerializeAsync(options);
		const passingValue = "pass";
		let error;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for await (const _ of serialize(passingValue)) {
				// Do nothing
			}
		} catch (e) {
			error = e;
		}

		expect(error).toBeUndefined();
	});

	it("should apply guards and throw if they return false", async ({
		expect,
	}) => {
		const options = {
			guards: [{ assert: () => false, key: "testGuard" }],
			types: [],
		};
		const serialize = createTsonSerializeAsync(options);
		const passingValue = "pass";
		let error;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for await (const _ of serialize(passingValue)) {
				// Do nothing
			}
		} catch (e) {
			error = e;
		}

		expect(error).toBeDefined();
		expect(error).toBeInstanceOf(Error);
		expect(error).toHaveProperty(
			"message",
			"Guard testGuard failed on value pass",
		);
	});

	it("should apply guards and not throw if they return true", async ({
		expect,
	}) => {
		const options = {
			guards: [{ assert: () => true, key: "testGuard" }],
			types: [],
		};
		const serialize = createTsonSerializeAsync(options);
		const passingValue = "pass";
		let error;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for await (const _ of serialize(passingValue)) {
				// Do nothing
			}
		} catch (e) {
			error = e;
		}

		expect(error).toBeUndefined();
	});

	it("should apply guards and throw if they throw", async ({ expect }) => {
		const options = {
			guards: [
				{
					assert: () => {
						throw new Error("testGuard error");
					},
					key: "testGuard",
				},
			],
			types: [],
		};
		const serialize = createTsonSerializeAsync(options);
		const passingValue = "pass";
		let error;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for await (const _ of serialize(passingValue)) {
				// Do nothing
			}
		} catch (e) {
			error = e;
		}

		expect(error).toBeDefined();
		expect(error).toBeInstanceOf(Error);
		expect(error).toHaveProperty("message", "testGuard error");
	});
});
