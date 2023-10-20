import { createSSEResponse } from "~/tsonOptions";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This function returns the object we will be sending to the client.
 */
export function getResponseShape() {
	const tuple = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
	async function* finiteListGenerator() {
		while (tuple.length) {
			yield tuple.shift();
			await sleep(500);
		}
	}

	return {
		finiteListGenerator: finiteListGenerator(),
	};
}

export type ResponseShape = ReturnType<typeof getResponseShape>;

export function GET() {
	const res = createSSEResponse(getResponseShape());

	return res;
}
