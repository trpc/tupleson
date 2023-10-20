/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { EventSourcePolyfill, NativeEventSource } from "event-source-polyfill";
import { expect, test } from "vitest";
(global as any).EventSource = NativeEventSource || EventSourcePolyfill;

import {
	TsonAsyncOptions,
	tsonAsyncIterable,
	tsonBigint,
	tsonPromise,
} from "../index.js";
import { createTestServer, sleep } from "../internals/testUtils.js";
import { createTsonAsync } from "./createTsonAsync.js";

test("SSE response test", async () => {
	function createMockObj() {
		async function* generator() {
			let i = 0;
			while (true) {
				yield i++;
				await sleep(10);
			}
		}

		return {
			iterable: generator(),
		};
	}

	type MockObj = ReturnType<typeof createMockObj>;

	// ------------- server -------------------
	const opts = {
		nonce: () => "__tson",
		types: [tsonPromise, tsonAsyncIterable],
	} satisfies TsonAsyncOptions;

	const server = await createTestServer({
		handleRequest: async (_req, res) => {
			const tson = createTsonAsync(opts);

			const obj = createMockObj();
			const response = tson.toSSEResponse(obj);

			for (const [key, value] of response.headers) {
				res.setHeader(key, value);
			}

			for await (const value of response.body as any) {
				res.write(value);
			}

			res.end();
		},
	});

	// ------------- client -------------------
	const tson = createTsonAsync(opts);

	{
		const sse = new EventSource(server.url);

		const messages: MessageEvent["data"][] = [];
		await new Promise<void>((resolve) => {
			sse.onmessage = (msg) => {
				// console.log(sse.readyState);
				// console.log({ msg });
				messages.push(msg.data);

				if (messages.length === 5) {
					sse.close();
					resolve();
				}
			};
		});

		expect(messages).toMatchInlineSnapshot(`
			[
			  "{\\"json\\":{\\"iterable\\":[\\"AsyncIterable\\",0,\\"__tson\\"]},\\"nonce\\":\\"__tson\\"}",
			  "[0,[0,0]]",
			  "[0,[0,1]]",
			  "[0,[0,2]]",
			  "[0,[0,3]]",
			]
		`);
	}

	{
		// e2e
		const ac = new AbortController();
		const shape = await tson.createEventSource<MockObj>(server.url, {
			signal: ac.signal,
		});

		const messages: number[] = [];

		for await (const value of shape.iterable) {
			messages.push(value);
			if (messages.length === 5) {
				ac.abort();
			}
		}

		expect(messages).toMatchInlineSnapshot(`
			[
			  0,
			  1,
			  2,
			  3,
			  4,
			]
		`);
	}
});

test("handle reconnects when response is interrupted", async () => {
	let i = 0;

	let kill = false;
	function createMockObj() {
		async function* generator() {
			while (true) {
				yield BigInt(i);
				i++;
				await sleep(10);

				if (i === 5) {
					kill = true;
				}

				if (i > 10) {
					// done
					return;
				}
			}
		}

		return {
			iterable: generator(),
		};
	}

	type MockObj = ReturnType<typeof createMockObj>;

	// ------------- server -------------------
	const opts = {
		nonce: () => "__tson" + i, // add index to nonce to make sure it's not cached
		types: [tsonPromise, tsonAsyncIterable, tsonBigint],
	} satisfies TsonAsyncOptions;

	const server = await createTestServer({
		handleRequest: async (_req, res) => {
			const tson = createTsonAsync(opts);

			const obj = createMockObj();
			const response = tson.toSSEResponse(obj);

			for (const [key, value] of response.headers) {
				res.setHeader(key, value);
			}

			for await (const value of response.body as any) {
				res.write(value);
				if (kill) {
					// interrupt the stream
					res.end();
					kill = false;
					return;
				}
			}

			res.end();
		},
	});

	// ------------- client -------------------
	const tson = createTsonAsync(opts);

	// e2e
	const ac = new AbortController();
	const shape = await tson.createEventSource<MockObj>(server.url, {
		reconnect: true,
		signal: ac.signal,
	});

	const messages: bigint[] = [];

	for await (const value of shape.iterable) {
		messages.push(value);
	}

	expect(messages).toMatchInlineSnapshot(`
		[
		  0n,
		  1n,
		  2n,
		  3n,
		  4n,
		  5n,
		  7n,
		  8n,
		  9n,
		  10n,
		]
	`);
});

test("handle reconnects - iterator wrapped in Promise", async () => {
	let i = 0;

	let kill = false;
	function createMockObj() {
		async function* generator() {
			while (true) {
				yield BigInt(i);
				i++;
				await sleep(10);

				if (i === 5) {
					kill = true;
				}

				if (i > 10) {
					// done
					return;
				}
			}
		}

		return {
			iterable: Promise.resolve(generator()),
		};
	}

	type MockObj = ReturnType<typeof createMockObj>;

	// ------------- server -------------------
	const opts = {
		nonce: () => "__tson" + i, // add index to nonce to make sure it's not cached
		types: [tsonPromise, tsonAsyncIterable, tsonBigint],
	} satisfies TsonAsyncOptions;

	const server = await createTestServer({
		handleRequest: async (_req, res) => {
			const tson = createTsonAsync(opts);

			const obj = createMockObj();
			const response = tson.toSSEResponse(obj);

			for (const [key, value] of response.headers) {
				res.setHeader(key, value);
			}

			for await (const value of response.body as any) {
				res.write(value);
				if (kill) {
					// interrupt the stream
					res.end();
					kill = false;
					return;
				}
			}

			res.end();
		},
	});

	// ------------- client -------------------
	const tson = createTsonAsync(opts);

	// e2e
	const ac = new AbortController();
	const shape = await tson.createEventSource<MockObj>(server.url, {
		reconnect: true,
		signal: ac.signal,
	});

	const messages: bigint[] = [];

	for await (const value of await shape.iterable) {
		messages.push(value);
	}

	expect(messages).toMatchInlineSnapshot(`
		[
		  0n,
		  1n,
		  2n,
		  3n,
		  4n,
		  5n,
		  7n,
		  8n,
		  9n,
		  10n,
		]
	`);
});
