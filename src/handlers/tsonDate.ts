import { TsonType } from "../types.js";

export const tsonDate: TsonType<Date, string> = {
	deserialize: (value) => new Date(value),
	serialize: (value) => value.toJSON(),
	test: (value) => value instanceof Date,
};
