import { assertType, describe, test } from "vitest";

import { tsonBigint } from "../index.js";
import { ChunkTypes, TsonAsyncTuple, TsonStatus } from "./asyncTypes2.js";
import { tsonPromise } from "./handlers/tsonPromise2.js";
import { createTsonSerializeAsync } from "./serializeAsync2.js";

describe("serialize", (it) => {
	it("should handle primitives correctly", async ({ expect }) => {
		const options = {
			guards: [],
			nonce: () => "__tsonNonce",
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
		expect(chunks[0]).toEqual([
			ChunkTypes.LEAF,
			["__tsonNonce0", "__tsonNonce", null],
			"HELLO",
			"string",
		]);
	});

	it("should handle circular references", async ({ expect }) => {
		const options = { guards: [], nonce: () => "__tsonNonce", types: [] };
		const serialize = createTsonSerializeAsync(options);
		const object: any = {};
		object.self = object; // Create a circular reference
		const chunks = [];

		for await (const chunk of serialize(object)) {
			chunks.push(chunk);
		}

		//console.log(chunks);

		expect(chunks.length).toBe(3);
		expect(chunks[0]).toEqual([
			ChunkTypes.HEAD,
			["__tsonNonce0", "__tsonNonce", null],
		]);

		expect
			.soft(chunks[1])
			.toEqual([
				ChunkTypes.REFERENCE,
				["__tsonNonce1", "__tsonNonce0", "self"],
				"__tsonNonce0",
			]);

		expect
			.soft(chunks[2])
			.toEqual([
				ChunkTypes.TAIL,
				["__tsonNonce2", "__tsonNonce0", null],
				TsonStatus.OK,
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

	it("should serialize JSON-serializable values without a handler", async ({
		expect,
	}) => {
		const options = { guards: [], nonce: () => "__tsonNonce", types: [] };
		const serialize = createTsonSerializeAsync(options);

		const source = 1;
		const chunks: TsonAsyncTuple[] = [];

		for await (const chunk of serialize(source)) {
			chunks.push(chunk);
		}

		const source2 = "hello";
		const chunks2: TsonAsyncTuple[] = [];

		for await (const chunk of serialize(source2)) {
			chunks2.push(chunk);
		}

		test.each([
			[source, chunks],
			[source2, chunks2],
		])(`chunks`, (original, result) => {
			expect(result.length).toBe(1);
			expect(result[0]).toEqual([
				ChunkTypes.LEAF,
				["__tsonNonce1", "__tsonNonce", null],
				JSON.stringify(original),
			]);
		});
	});

	it("should serialize values with a sync handler", async ({ expect }) => {
		const options = {
			guards: [],
			nonce: () => "__tsonNonce",
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
		expect(chunks[0]).toEqual([
			ChunkTypes.LEAF,
			["__tsonNonce0", "__tsonNonce", null],
			"0",
			"bigint",
		]);
	});

	it("should serialize values with an async handler", async ({ expect }) => {
		const options = {
			guards: [],
			nonce: () => "__tsonNonce",
			types: [tsonPromise],
		};
		const serialize = createTsonSerializeAsync(options);
		const source = Promise.resolve("hello");
		const chunks = [];

		for await (const chunk of serialize(source)) {
			chunks.push(chunk);
		}

		//console.log(chunks);
		expect(chunks.length).toBe(6);
		expect
			.soft(chunks[0])
			.toEqual([
				ChunkTypes.HEAD,
				["__tsonNonce0", "__tsonNonce", null],
				"Promise",
			]);
		expect
			.soft(chunks[1])
			.toEqual([ChunkTypes.HEAD, ["__tsonNonce1", "__tsonNonce0", null]]);
		expect
			.soft(chunks[2])
			.toEqual([ChunkTypes.LEAF, ["__tsonNonce2", "__tsonNonce1", 0], "0"]);
		expect
			.soft(chunks[3])
			.toEqual([
				ChunkTypes.TAIL,
				["__tsonNonce3", "__tsonNonce0", null],
				TsonStatus.OK,
			]);
		expect
			.soft(chunks[4])
			.toEqual([ChunkTypes.LEAF, ["__tsonNonce4", "__tsonNonce1", 1], "hello"]);
		expect
			.soft(chunks[5])
			.toEqual([
				ChunkTypes.TAIL,
				["__tsonNonce5", "__tsonNonce1", null],
				TsonStatus.OK,
			]);
	});
});
