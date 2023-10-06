import { createTsonParseAsync } from "tupleson";
import waitPort from "wait-port";

import type { ResponseShape } from "./server.js";

import { mapIterable, readableStreamToAsyncIterable } from "./iteratorUtils.js";
import { tsonOptions } from "./shared.js";

// create the async parser
const tsonParseAsync = createTsonParseAsync(tsonOptions);

async function main() {
	const port = 3000;
	await waitPort({ port });

	// <request to server - boring, you can skip this>
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
	// </request to server>

	// ✨ ✨ ✨ ✨  parse the response body stream  ✨ ✨ ✨ ✨ ✨
	const output = await tsonParseAsync<ResponseShape>(stringIterator);

	// .... we can now use the output as a normal object 🤯🤯
	console.log({ output });

	console.log("[output.promise] Promise result:", await output.promise);

	// Iterate over the async iterators
	const printBigInts = async () => {
		for await (const value of output.bigints) {
			console.log(`[output.bigints] Received bigint:`, value);
		}
	};

	// Iterate over the async iterators
	const printNumbers = async () => {
		for await (const value of output.numbers) {
			console.log(`[output.numbers] Received number:`, value);
		}
	};

	await Promise.all([printBigInts(), printNumbers()]);

	console.log(
		`✅ Output ended - visit http://localhost:${port} to see the raw server output`,
	);
}

main().catch((err) => {
	console.error(err);
	throw err;
});
