import http from "node:http";
import { expect } from "vitest";

import { assert } from "./assert.js";

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

export const expectSequence = <T>(sequence: T[]) => ({
	toHave(value: T) {
		expect(sequence).toContain(value);
		assert(value);

		return {
			after(preceding: T) {
				expect(preceding).toBeDefined();
				assert(preceding);

				const index = sequence.indexOf(value);
				const precedingIndex = sequence.indexOf(preceding);
				expect(index).toBeGreaterThanOrEqual(0);
				expect(precedingIndex).toBeGreaterThanOrEqual(0);
				expect(
					index,
					`Expected ${JSON.stringify(
						value,
						null,
						2,
					)} to come after ${JSON.stringify(preceding, null, 2)}`,
				).toBeGreaterThan(precedingIndex);
			},
			afterAll(following: T[]) {
				expect(following).toBeDefined();
				assert(following);
				for (const followingValue of following) {
					this.after(followingValue);
				}
			},
			before(following: T) {
				expect(following, "following").toBeDefined();
				assert(following);

				const index = sequence.indexOf(value);
				const followingIndex = sequence.indexOf(following);
				expect(index).toBeGreaterThanOrEqual(0);
				expect(followingIndex).toBeGreaterThanOrEqual(0);
				expect(
					index,
					`Expected ${JSON.stringify(
						value,
						null,
						2,
					)} to come before ${JSON.stringify(following, null, 2)}`,
				).toBeLessThan(followingIndex);
			},
			beforeAll(following: T[]) {
				for (const followingValue of following) {
					this.before(followingValue);
				}
			},
		};
	},
	toHaveAll(values: T[]) {
		const thisHas = this.toHave.bind(this);

		for (const value of values) {
			thisHas(value);
		}

		return {
			after(preceding: T) {
				for (const value of values) {
					thisHas(value).after(preceding);
				}
			},
			afterAll(following: T[]) {
				for (const value of values) {
					thisHas(value).afterAll(following);
				}
			},
			before(following: T) {
				for (const value of values) {
					thisHas(value).before(following);
				}
			},
			beforeAll(following: T[]) {
				for (const value of values) {
					thisHas(value).beforeAll(following);
				}
			},
		};
	},
});
