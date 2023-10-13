import { createSSEResponse } from "../../tsonOptions";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This function returns the object we will be sending to the client.
 */
export function getResponseShape() {
	async function* currentTimeGenerator() {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while (true) {
			await sleep(100);
			const date = new Date();
			const hours = date.getHours();
			const minutes = date.getMinutes();
			const seconds = date.getSeconds();
			const time = `${hours}:${minutes}:${seconds}`;
			yield time;
		}
	}

	return {
		currentTimeGenerator: currentTimeGenerator(),
	};
}

export type ResponseShape = ReturnType<typeof getResponseShape>;

export function GET() {
	const res = createSSEResponse(getResponseShape());

	return res;
}
