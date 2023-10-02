import { isPlainObject } from "./isPlainObject.js";

/**
 * Maps over an object or array, returning a new object or array with the same keys.
 * If the input is not an object or array, the input is returned.
 */

export function mapOrReturn(
	input: unknown,
	fn: (val: unknown, key: number | string) => unknown,
): unknown {
	if (Array.isArray(input)) {
		return input.map(fn);
	}

	if (isPlainObject(input)) {
		const output: typeof input = {};
		for (const [key, value] of Object.entries(input)) {
			output[key] = fn(value, key);
		}

		return output;
	}

	return input;
}
