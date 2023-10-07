import { TsonType } from "../sync/syncTypes.js";

export const tsonURL: TsonType<URL, string> = {
	deserialize: (value) => new URL(value),
	key: "URL",
	serialize: (value) => value.toString(),
	test: (value) => value instanceof URL,
};
