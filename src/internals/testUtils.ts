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
