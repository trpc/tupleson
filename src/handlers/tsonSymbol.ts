import { TsonType } from "../sync/syncTypes.js";

export const tsonSymbol = <T extends symbol>(
	symbol: T,
): TsonType<T, string> => {
	const key = symbol.toString();
	return {
		deserialize: () => symbol,
		key,
		serialize: () => key,
		test: (v) => v === symbol,
	};
};
