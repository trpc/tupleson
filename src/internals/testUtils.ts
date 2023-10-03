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
	fnOrPromise: (() => unknown) | Promise<unknown>,
) => {
	let err: unknown;
	try {
		await (typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise);
	} catch (_err) {
		err = _err;
	}

	expect(err).toBeDefined();
	expect(err).toBeInstanceOf(Error);
	return err as Error;
};
