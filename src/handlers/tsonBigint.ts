import { TsonType } from "../types.js";

export const tsonBigint: TsonType<bigint, string> = {
	deserialize: (v) => BigInt(v),
	primitive: "bigint",
	serialize: (v) => v.toString(),
};
