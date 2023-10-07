import { TsonType } from "../sync/syncTypes.js";

export const tsonRegExp: TsonType<RegExp, string> = {
	deserialize: (str) => {
		const body = str.slice(1, str.lastIndexOf("/"));
		const flags = str.slice(str.lastIndexOf("/") + 1);
		return new RegExp(body, flags);
	},
	key: "RegExp",
	serialize: (value) => "" + value,
	test: (value) => value instanceof RegExp,
};
