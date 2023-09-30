import { TsonType } from "../types.js";

export const tsonSet: TsonType<Set<unknown>, unknown[]> = {
	deserialize: (v) => new Set(v),
	key: "Set",
	serialize: (v) => Array.from(v),
	test: (v) => v instanceof Set,
};
