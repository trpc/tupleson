import http from "node:http";
import { createTsonStringifyAsync } from "tupleson";

import { tsonOptions } from "./shared.js";

const stringify = createTsonStringifyAsync(tsonOptions);

const randomNumber = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1) + min);
};

export function getResponseShape() {
	async function* bigintGenerator() {
		const iterate = new Array(10).fill(0).map((_, i) => BigInt(i));
		for (const number of iterate) {
			await new Promise((resolve) => setTimeout(resolve, randomNumber(1, 400)));
			yield number;
		}
	}

	async function* numberGenerator() {
		const iterate = new Array(10).fill(0).map((_, i) => i);
		for (const number of iterate) {
			await new Promise((resolve) => setTimeout(resolve, randomNumber(1, 400)));
			yield number;
		}
	}

	return {
		bigints: bigintGenerator(),
		foo: "bar",
		numbers: numberGenerator(),
		// promise: Promise.resolve(42),
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
	res.writeHead(200, { "Content-Type": "application/json" });

	const obj = getResponseShape();

	for await (const chunk of stringify(obj)) {
		res.write(chunk);
	}
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
