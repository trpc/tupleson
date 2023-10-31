import { tsonAssert } from "../../tsonAssert.js";

/**
 * Prevents `NaN` and `Infinity` from being serialized
 */

export const tsonAssertNotInfinite = tsonAssert((v) => {
	if (typeof v !== "number") {
		return;
	}

	if (isNaN(v)) {
		throw new Error("Encountered NaN");
	}

	if (!isFinite(v)) {
		throw new Error("Encountered Infinity");
	}
});
