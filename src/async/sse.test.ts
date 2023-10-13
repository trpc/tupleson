/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { EventSourcePolyfill, NativeEventSource } from "event-source-polyfill";
import { expect, test } from "vitest";
global.EventSource = NativeEventSource || EventSourcePolyfill;

import { TsonAsyncOptions, tsonAsyncIterable, tsonPromise } from "../index.js";
import { createTestServer, sleep } from "../internals/testUtils.js";
import { createTsonAsync } from "./createTsonAsync.js";

test("SSE response test", async () => {
	function createMockObj() {
		async function* generator() {
			let i = 0;
			while (true) {
				yield i++;
				await sleep(100);
			}
		}

		return {
			foo: "bar",
			iterable: generator(),
			promise: Promise.resolve(42),
			rejectedPromise: Promise.reject(new Error("rejected promise")),
		};
	}

	// type MockObj = ReturnType<typeof createMockObj>;

	// ------------- server -------------------
	const opts = {
		nonce: () => "__tson",
		types: [tsonPromise, tsonAsyncIterable],
	} satisfies TsonAsyncOptions;

	const server = await createTestServer({
		handleRequest: async (req, res) => {
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
	// const tson = createTsonAsync(opts);

	// do a streamed fetch request
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
		  "{\\"json\\":{\\"foo\\":\\"bar\\",\\"iterable\\":[\\"AsyncIterable\\",0,\\"__tson\\"],\\"promise\\":[\\"Promise\\",1,\\"__tson\\"],\\"rejectedPromise\\":[\\"Promise\\",2,\\"__tson\\"]},\\"nonce\\":\\"__tson\\"}",
		  "[0,[0,0]]",
		  "[1,[0,42]]",
		  "[2,[1,{}]]",
		  "[0,[0,1]]",
		]
	`);
});

test.todo("parse SSE response");
