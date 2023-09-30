import { TsonType } from "../types.js";

const symbols: symbol[] = [];
export const tsonSymbol = <T extends symbol>(
	symbol: T,
): TsonType<T, number> => {
	symbols.push(symbol);
	const index = symbols.length - 1;
	return {
		deserialize: (index) => symbols[index] as T,
		key: `Symbol${index}`,
		serialize: () => index,
		test: (v) => v === symbol,
	};
};
