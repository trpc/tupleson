import { TsonType } from "./types.js";
import { isPlainObject } from "./utils.js";

export const tsonMap: TsonType<Map<unknown, unknown>, [unknown, unknown][]> = {
	deserialize: (v) => new Map(v),
	serialize: (v) => Array.from(v.entries()),
	test: (v) => v instanceof Map,
};

export const tsonSet: TsonType<Set<unknown>, unknown[]> = {
	deserialize: (v) => new Set(v),
	serialize: (v) => Array.from(v),
	test: (v) => v instanceof Set,
};

export const tsonBigint: TsonType<bigint, string> = {
	deserialize: (v) => BigInt(v),
	primitive: "bigint",
	serialize: (v) => v.toString(),
};

/**
 * Prevents `NaN` and `Infinity` from being serialized
 */
export const tsonNumber: TsonType<number, number> = {
	primitive: "number",
	test: (v) => {
		const value = v as number;
		if (isNaN(value)) {
			throw new Error("Encountered NaN");
		}

		if (!isFinite(value)) {
			throw new Error("Encountered Infinity");
		}

		return false;
	},
	transform: false,
};

export const tsonUndefined: TsonType<undefined, 0> = {
	deserialize: () => undefined,
	primitive: "undefined",
	serialize: () => 0,
};

export const tsonDate: TsonType<Date, string> = {
	deserialize: (value) => new Date(value),
	serialize: (value) => value.toJSON(),
	test: (value) => value instanceof Date,
};

export class UnknownObjectGuardError extends Error {
	public readonly value;

	constructor(value: unknown) {
		super(`Unknown object found`);
		this.name = this.constructor.name;
		this.value = value;
	}
}

export const tsonUnknown: TsonType<unknown, never> = {
	test: (v) => {
		if (v && typeof v === "object" && !Array.isArray(v) && !isPlainObject(v)) {
			throw new UnknownObjectGuardError(v);
		}

		return false;
	},
	transform: false,
};

export const tsonRegExp: TsonType<RegExp, string> = {
	deserialize: (str) => {
		const body = str.slice(1, str.lastIndexOf("/"));
		const flags = str.slice(str.lastIndexOf("/") + 1);
		return new RegExp(body, flags);
	},
	serialize: (value) => "" + value,
	test: (value) => value instanceof RegExp,
};
