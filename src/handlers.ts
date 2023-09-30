import { TsonType } from "./types";
import { isPlainObject } from "./utils";

export const tsonMap: TsonType<Map<unknown, unknown>, [unknown, unknown][]> = {
	test: (v) => v instanceof Map,
	serialize: (v) => Array.from(v.entries()),
	deserialize: (v) => new Map(v),
};

export const tsonSet: TsonType<Set<unknown>, unknown[]> = {
	test: (v) => v instanceof Set,
	serialize: (v) => Array.from(v),
	deserialize: (v) => new Set(v),
};

export const tsonBigint: TsonType<bigint, string> = {
	primitive: "bigint",
	deserialize: (v) => BigInt(v),
	serialize: (v) => v.toString(),
};

/**
 * Prevents `NaN` and `Infinity` from being serialized
 */
export const tsonNumber: TsonType<number, number> = {
	primitive: "number",
	transform: false,
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
};

export const tsonUndefined: TsonType<undefined, 0> = {
	primitive: "undefined",
	serialize: () => 0,
	deserialize: () => undefined,
};

export const tsonDate: TsonType<Date, string> = {
	serialize: (value) => value.toJSON(),
	deserialize: (value) => new Date(value),
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
	transform: false,
	test: (v) => {
		if (v && typeof v === "object" && !Array.isArray(v) && !isPlainObject(v)) {
			throw new UnknownObjectGuardError(v);
		}
		return false;
	},
};

export const tsonRegExp: TsonType<RegExp, string> = {
	test: (value) => value instanceof RegExp,
	serialize: (value) => "" + value,
	deserialize: (str) => {
		const body = str.slice(1, str.lastIndexOf("/"));
		const flags = str.slice(str.lastIndexOf("/") + 1);
		return new RegExp(body, flags);
	},
};
