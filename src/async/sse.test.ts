import { expect, test, vitest } from "vitest";

import {
	TsonAsyncOptions,
	TsonParseAsyncOptions,
	TsonType,
	createTsonParseAsync,
	tsonAsyncIterable,
	tsonBigint,
	tsonPromise,
} from "../index.js";
import { assert } from "../internals/assert.js";
import {
	createDeferred,
	createTestServer,
	sleep,
	waitError,
	waitFor,
} from "../internals/testUtils.js";
import { TsonSerialized } from "../sync/syncTypes.js";
import { createTsonAsync } from "./createTsonAsync.js";
import { mapIterable, readableStreamToAsyncIterable } from "./iterableUtils.js";

test("SSE response test", async () => {
	function createMockObj() {
		async function* generator() {
			for (let i = 0; i < 10; i++) {
				yield i;
				await sleep(1);

				await sleep(1);
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
	const opts = {
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

	// do a streamed fetch request
	const sse = new EventSource(server.url);

	let messages: MessageEvent[];
	await new Promise(() => {
		sse.onmessage = (msg) => {
			messages.push(msg);
		};

		sse.addEventListener("error", () => {
			console.error("error");
		});
	});
});
