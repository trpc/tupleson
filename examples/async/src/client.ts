import type { ResponseShape } from "./server";

import { mapIterable, readableStreamToAsyncIterable } from "./iteratorUtils";
import { tsonAsync } from "./shared";

async function main() {
	// do a streamed fetch request
	const port = 3000;
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

	const parsedRaw = await tsonAsync.parse(stringIterator);
	const parsed = parsedRaw as ResponseShape;

	const printBigInts = async () => {
		for await (const value of parsed.bigints) {
			console.log(`Received bigint:`, value);
		}
	};

	const printNumbers = async () => {
		for await (const value of parsed.numbers) {
			console.log(`Received number:`, value);
		}
	};

	await Promise.all([printBigInts(), printNumbers()]);

	console.log("Output ended");
}

main().catch((err) => {
	console.error(err);
	throw err;
});
