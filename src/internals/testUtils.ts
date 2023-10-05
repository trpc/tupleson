import http from "node:http";
import { expect } from "vitest";

export const expectError = (fn: () => unknown) => {
	let err: unknown;
	try {
		fn();
	} catch (_err) {
		err = _err;
	}

	expect(err).toBeDefined();
	expect(err).toBeInstanceOf(Error);
	return err as Error;
};

export const waitError = async (
	promiseOrFn: (() => unknown) | Promise<unknown>,
) => {
	let err: unknown;
	try {
		await (typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn);
	} catch (_err) {
		err = _err;
	}

	expect(err).toBeDefined();
	expect(err).toBeInstanceOf(Error);
	return err as Error;
};

export const waitFor = async (fn: () => unknown) => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	while (true) {
		try {
			await fn();
			return;
		} catch {
			// wait 5ms
			await new Promise((resolve) => setTimeout(resolve, 5));
		}
	}
};

export async function createTestServer(opts: {
	handleRequest: (
		req: http.IncomingMessage,
		res: http.ServerResponse,
	) => Promise<void> | void;
}) {
	const server = await new Promise<http.Server>((resolve) => {
		const server = http.createServer((req, res) => {
			Promise.resolve(opts.handleRequest(req, res)).catch((err) => {
				console.error(err);
				res.statusCode = 500;
				res.end();
			});
		});

		server.listen(0, () => {
			resolve(server);
		});
	});

	const port = (server.address() as any).port as number;

	return {
		close: () => {
			server.close();
		},
		port,
		url: `http://localhost:${port}`,
	};
}
