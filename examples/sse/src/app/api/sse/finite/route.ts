import { createSSEResponse } from "../../../tsonOptions";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This function returns the object we will be sending to the client.
 */
export function getResponseShape() {
	let i = 0;
	async function* finiteListGenerator() {
		while (i < 10) {
			yield i++;
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
