import { TsonType } from "../syncTypes.js";

export const tsonSet: TsonType<Set<unknown>, unknown[]> = {
	deserialize: (v) => new Set(v),
	key: "Set",
	serialize: (v) => Array.from(v),
	test: (v) => v instanceof Set,
};
