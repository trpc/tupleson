import fs from "node:fs";
import http from "node:http";
import { createTsonSSEResponse } from "tupleson";

import { tsonOptions } from "./shared.js";

const createResponse = createTsonSSEResponse(tsonOptions);

const randomNumber = (min: number, max: number) =>
	Math.floor(Math.random() * (max - min + 1) + min);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This function returns the object we will be sending to the client.
 */
export function getResponseShape() {
	async function* bigintGenerator() {
		const iterate = new Array(10).fill(0).map((_, i) => BigInt(i));
		for (const number of iterate) {
			await sleep(randomNumber(1, 400));
			yield number;
		}
	}

	async function* numberGenerator() {
		const iterate = new Array(10).fill(0).map((_, i) => i);
		for (const number of iterate) {
			await sleep(randomNumber(1, 400));
			yield number;
		}
	}

	return {
		bigints: bigintGenerator(),
		foo: "bar",
		numbers: numberGenerator(),
		promise: new Promise<number>((resolve) =>
			setTimeout(() => {
				resolve(42);
			}, 1),
		),
		rejectedPromise: new Promise<number>((_, reject) =>
			setTimeout(() => {
				reject(new Error("Rejected promise"));
			}, 1),
		),
	};
}

export type ResponseShape = ReturnType<typeof getResponseShape>;
async function handleRequest(
	req: http.IncomingMessage,
	res: http.ServerResponse,
) {
	if (req.url?.startsWith("/sse")) {
		const obj = getResponseShape();
		const response = createResponse(obj);

		// Stream the response to the client
		for (const [key, value] of response.headers) {
			res.setHeader(key, value);
		}

		for await (const value of response.body as any) {
			res.write(value);
		}

		res.end();
		return;
	}

	const data = fs.readFileSync(__dirname + "/index.html");
	res.write(data.toString());
	res.end();
}

const server = http.createServer(
	(req: http.IncomingMessage, res: http.ServerResponse) => {
		handleRequest(req, res).catch((err) => {
			console.error(err);
			res.writeHead(500, { "Content-Type": "text/plain" });
			res.end("Internal Server Error\n");
		});
	},
);

const port = 3000;
server.listen(port);

console.log(`Server running at http://localhost:${port}`);
