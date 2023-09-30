import { TsonType } from "../types.js";

export const tsonUndefined: TsonType<undefined, 0> = {
	deserialize: () => undefined,
	primitive: "undefined",
	serialize: () => 0,
};
