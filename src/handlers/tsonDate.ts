import { TsonType } from "../sync/syncTypes.js";

export const tsonDate: TsonType<Date, string> = {
	deserialize: (value) => new Date(value),
	key: "Date",
	serialize: (value) => value.toJSON(),
	test: (value) => value instanceof Date,
};
