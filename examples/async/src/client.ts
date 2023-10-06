import { createTsonParseAsync } from "tupleson";
import waitPort from "wait-port";

import type { ResponseShape } from "./server.js";

import { mapIterable, readableStreamToAsyncIterable } from "./iteratorUtils.js";
import { tsonOptions } from "./shared.js";

const parseAsync = createTsonParseAsync(tsonOptions);

async function main() {
	// do a streamed fetch request
	const port = 3000;
	await waitPort({ port });

	const response = await fetch(`http://localhost:${port}`);

	if (!response.body) {
		throw new Error("Response body is empty");
	}

	const textDecoder = new TextDecoder();

	// convert the response body to an async iterable
	const stringIterator = mapIterable(
		readableStreamToAsyncIterable(response.body),
		(v) => textDecoder.decode(v),
	);

	// ✨ ✨ ✨ ✨  parse the response body stream  ✨ ✨ ✨ ✨ ✨
	const output = await parseAsync<ResponseShape>(stringIterator);

	// we can now use the output as a normal object
	console.log({ output });

	const printBigInts = async () => {
		for await (const value of output.bigints) {
			console.log(`Received bigint:`, value);
		}
	};

	const printNumbers = async () => {
		for await (const value of output.numbers) {
			console.log(`Received number:`, value);
		}
	};

	await Promise.all([printBigInts(), printNumbers()]);

	console.log("✅ Output ended");
}

main().catch((err) => {
	console.error(err);
	throw err;
});
