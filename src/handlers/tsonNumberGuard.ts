import { TsonType } from "../sync/syncTypes.js";

/**
 * Prevents `NaN` and `Infinity` from being serialized
 */

export const tsonNumberGuard: TsonType<number, number> = {
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
};
