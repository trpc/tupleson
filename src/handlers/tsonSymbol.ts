import { TsonType } from "../types.js";

export const tsonSymbol = <T extends symbol>(
	symbol: T,
): TsonType<T, string> => {
	return {
		deserialize: () => symbol,
		key: symbol.toString(),
		serialize: () => symbol.toString(),
		test: (v) => v === symbol,
	};
};
