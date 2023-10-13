import { createSSEResponse } from "../../tsonOptions";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This function returns the object we will be sending to the client.
 */
export function getResponseShape() {
	async function* currentTimeGenerator() {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while (true) {
			yield new Intl.DateTimeFormat("en-US", {
				hour: "numeric",
				hour12: false,
				minute: "numeric",
				second: "numeric",
			}).format(new Date());
			await sleep(500);
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
