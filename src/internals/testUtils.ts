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
			await sleep(5);
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

export function createDeferred<T>() {
	type PromiseResolve = (value: T) => void;
	type PromiseReject = (reason: unknown) => void;
	const deferred = {} as {
		promise: Promise<T>;
		reject: PromiseReject;
		resolve: PromiseResolve;
	};
	deferred.promise = new Promise<T>((resolve, reject) => {
		deferred.resolve = resolve;
		deferred.reject = reject;
	});
	return deferred;
}

export const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const createPromise = <T>(result: () => T, wait = 1) => {
	return new Promise<T>((resolve, reject) => {
		setTimeout(() => {
			try {
				const res = result();
				resolve(res);
			} catch (err) {
				reject(err);
			}
		}, wait);
	});
};
