import { TsonCircularReferenceError } from "../index.js";
import { isComplexValue } from "./isComplexValue.js";

export function createAcyclicCacheRegistrar() {
	const seen = new WeakSet();
	const cache = new WeakMap();

	return function register<T>(value: T) {
		const $unset = Symbol("Not undefined or null, but unset");
		let cached: T | typeof $unset = $unset;

		if (isComplexValue(value)) {
			if (seen.has(value)) {
				cached = cache.get(value) as T;
				if (!cached) {
					throw new TsonCircularReferenceError(value);
				}
			} else {
				seen.add(value);
			}
		}

		return function cacheAndReturn(result: T) {
			if (isComplexValue(value) && cached === $unset) {
				cache.set(value, result);

				return result;
			}

			return result;
		};
	};
}
