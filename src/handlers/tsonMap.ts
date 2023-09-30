import { TsonType } from "../types.js";

export const tsonMap: TsonType<Map<unknown, unknown>, [unknown, unknown][]> = {
	deserialize: (v) => new Map(v),
	serialize: (v) => Array.from(v.entries()),
	test: (v) => v instanceof Map,
};
