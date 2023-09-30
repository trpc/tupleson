import { TsonType } from "../types.js";

/**
 * Prevents `NaN` and `Infinity` from being serialized
 */

export const tsonNumber: TsonType<number, number> = {
	primitive: "number",
	test: (v) => {
		const value = v as number;
		if (isNaN(value)) {
			throw new Error("Encountered NaN");
		}

		if (!isFinite(value)) {
			throw new Error("Encountered Infinity");
		}

		return false;
	},
	transform: false,
};
