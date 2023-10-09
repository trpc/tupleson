import OpenAI from "openai";
import { expect, test } from "vitest";

import { createTsonAsync, tsonAsyncIterator, tsonPromise } from "../index.js";
import { assert } from "../internals/assert.js";

const apiKey = process.env["OPENAI_API_KEY"];

// OPENAI_API_KEY=sk-xxxxxxx pnpm test openai
test.skipIf(!apiKey)("openai", async () => {
	assert(apiKey);
	const openai = new OpenAI({
		apiKey: apiKey,
	});

	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonAsyncIterator, tsonPromise],
	});

	const stringified = tson.stringify({
		stream: await openai.chat.completions.create({
			messages: [{ content: "Say this is a test", role: "user" }],
			model: "gpt-4",
			stream: true,
		}),
	});

	const parsed = await tson.parse(stringified);

	let buffer = "";
	for await (const out of parsed.stream) {
		for (const choice of out.choices) {
			if (choice.delta.content) {
				buffer += choice.delta.content;
			}
		}
	}

	expect(buffer).toMatchInlineSnapshot('"This is a test."');
});