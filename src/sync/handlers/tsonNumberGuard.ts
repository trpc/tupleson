import { TsonGuard } from "../../tsonAssert.js";

/**
 * Prevents `NaN` and `Infinity` from being serialized
 */

export const tsonNumberGuard: TsonGuard<Exclude<unknown, number>> = {
	assert(v: unknown) {
		if (typeof v !== "number") {
			return;
		}

		if (isNaN(v)) {
			throw new Error("Encountered NaN");
		}

		if (!isFinite(v)) {
			throw new Error("Encountered Infinity");
		}
	},
	key: "tsonAssertNotInfinite",
};
